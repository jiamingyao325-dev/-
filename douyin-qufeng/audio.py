# 合成配乐：每种曲风一段，按 timeline.json 卡点 —— 运行：python3 audio.py
import json, wave
import numpy as np
from scipy.signal import butter, sosfilt

SR = 44100
rng = np.random.default_rng(7)
scenes = json.load(open('timeline.json'))['scenes']
starts, t = [], 0.0
for s in scenes:
    starts.append(t)
    t += s['beats'] * 60 / s['bpm']
TOTAL = t
buf = np.zeros((int((TOTAL + 1) * SR), 2))


def T(d): return np.arange(int(d * SR)) / SR
def hz(m): return 440 * 2 ** ((m - 69) / 12)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def n(s):  # 'C#4' -> midi
    m = NOTE[s[0]] + (1 if '#' in s else -1 if 'b' in s[1:] else 0)
    return m + 12 * (int(s[-1]) + 1)
def f(s): return hz(n(s))
def filt(x, kind, fc, order=2):
    return sosfilt(butter(order, fc, kind, fs=SR, output='sos'), x)
def noise(d): return rng.uniform(-1, 1, int(d * SR))


def add(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i < 0: sig, i = sig[-i:], 0
    j = min(i + len(sig), len(buf))
    sig = sig[:j - i] * gain
    buf[i:j, 0] += sig * (1 - max(pan, 0))
    buf[i:j, 1] += sig * (1 + min(pan, 0))


# ---------- 乐器 ----------
def kick(d=0.45, f0=150, f1=45, decay=0.2):
    t = T(d); fr = f1 + (f0 - f1) * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / decay)
def snare(d=0.25, tone=190):
    t = T(d)
    return filt(noise(d), 'highpass', 1200) * np.exp(-t / 0.06) * 0.8 + np.sin(2 * np.pi * tone * t) * np.exp(-t / 0.04) * 0.5
def hat(open_=False):
    d = 0.3 if open_ else 0.05; t = T(d)
    return filt(noise(d), 'highpass', 7000) * np.exp(-t / (0.09 if open_ else 0.012))
def clap():
    d = 0.3; t = T(d); out = np.zeros(len(t))
    for o in (0, 0.011, 0.022):
        k = int(o * SR); out[k:] += np.exp(-t[:len(t) - k] / (0.008 if o < 0.02 else 0.07))
    return filt(noise(d), 'bandpass', [900, 4000]) * out
def snap():
    d = 0.12; t = T(d)
    return filt(noise(d), 'bandpass', [1800, 3500]) * np.exp(-t / 0.018) * 1.4
def ride(d=0.9):
    t = T(d); s = sum(np.sin(2 * np.pi * fr * t) for fr in (3150, 4420, 5810, 7230))
    return (s * 0.25 + filt(noise(d), 'highpass', 6000) * 0.4) * np.exp(-t / 0.35)
def crash(d=2.0):
    t = T(d); return filt(noise(d), 'highpass', 4500) * np.exp(-t / 0.6)
def shaker():
    d = 0.08; t = T(d)
    return filt(noise(d), 'bandpass', [4000, 9000]) * np.sin(np.pi * t / d) ** 2
def whoosh(d=0.4):
    t = T(d); return filt(noise(d), 'bandpass', [600, 5000]) * (t / d) ** 3
def sine(fr, d, decay=0.3, att=0.005):
    t = T(d); return np.sin(2 * np.pi * fr * t) * np.minimum(t / att, 1) * np.exp(-t / decay)
def sub808(fr, d):
    t = T(d); fr_t = fr * (1 + 0.5 * np.exp(-t / 0.02))
    return np.tanh(1.6 * np.sin(2 * np.pi * np.cumsum(fr_t) / SR)) * np.exp(-t / (d * 0.5))
def piano(fr, d, decay=0.8):
    t = T(d); out = np.zeros(len(t))
    for k in range(1, 7):
        out += np.sin(2 * np.pi * fr * k * (1 + 0.0004 * k * k) * t) / k ** 1.6 * np.exp(-t / (decay / k ** 0.7))
    return out * np.minimum(t / 0.003, 1) * 0.6
def rhodes(fr, d):
    t = T(d)
    s = np.sin(2 * np.pi * fr * t) + 0.25 * np.sin(2 * np.pi * fr * 2 * t) * np.exp(-t / 0.15)
    return s * np.minimum(t / 0.01, 1) * np.exp(-t / 1.6) * (1 + 0.25 * np.sin(2 * np.pi * 5 * t)) * 0.4
def pluck(fr, d, damp=0.996):
    N = int(SR / fr); ln = int(d * SR)
    line = list(rng.uniform(-1, 1, N)); out = np.zeros(ln)
    for i in range(ln):
        v = line[i % N]; out[i] = v
        line[i % N] = damp * 0.5 * (v + line[(i + 1) % N])
    return out
def saw(fr, t): return 2 * ((t * fr) % 1) - 1
def guitar(notes, d, mute=True):
    t = T(d)
    s = sum(saw(fr * dt, t) for fr in notes for dt in (0.997, 1.003))
    s = np.tanh(s * 4) * (np.exp(-t / 0.07) if mute else np.exp(-t / 0.8))
    return filt(s, 'lowpass', 2500 if mute else 4000) * 0.5
def lead(fr, d):
    t = T(d)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 6 * t)
    s = np.sign(np.sin(2 * np.pi * fr * np.cumsum(vib) / SR)) * 0.5 + saw(fr * 1.005, t) * 0.5
    return filt(s, 'lowpass', 3500) * np.minimum(t / 0.01, 1) * np.exp(-t / 0.4) * 0.35
def pad(frs, d):
    t = T(d); s = sum(saw(fr, t) + saw(fr * 1.006, t) for fr in frs)
    return filt(s, 'lowpass', 1200) * np.minimum(t / 0.4, 1) * np.minimum((d - t) / 0.3, 1) * 0.08


# ---------- 各段 ----------
def intro(t0, b):
    add(pad([f('A3'), f('C4'), f('E4'), f('A4')], 7 * b), t0, 0.9)
    for i in range(14):
        add(hat(), t0 + i * b / 2, 0.25 + 0.03 * i)
    for i in range(8):
        add(hat(), t0 + 5 * b + i * b / 4, 0.4)
    for k in (0, 2, 4):
        add(kick(), t0 + k * b, 0.8)
    t = T(2 * b); add(filt(noise(2 * b), 'bandpass', [1500, 6000]) * (t / (2 * b)) ** 2, t0 + 5 * b, 0.35)


def hiphop(t0, b, beats=8, melody=True):
    e = b / 2
    for bar in range(beats // 4):
        tb = t0 + bar * 4 * b
        for st in (0, 3, 5):
            add(kick(decay=0.25), tb + st * e, 1.0)
        for st in (2, 6):
            add(snare(), tb + st * e, 0.8)
        for st in range(8):
            add(hat(), tb + st * e + (0.03 if st % 2 else 0), 0.35)
        root = f('A1') if bar % 2 == 0 else f('F1')
        add(sub808(root, 1.2), tb, 0.55)
        add(sub808(root, 0.6), tb + 3 * e, 0.45)
    if melody:
        for i, m in enumerate(['A4', 'C5', 'E5', 'C5', 'G4', 'A4', 'E5', 'D5']):
            add(pluck(f(m), 0.5), t0 + i * b + e, 0.3, pan=0.3)


def jazz(t0, b):
    sw = b * 2 / 3
    for i in range(12):
        add(ride(), t0 + i * b, 0.35, pan=0.4)
        if i % 2 == 1:
            add(ride(0.5), t0 + i * b + sw, 0.22, pan=0.4)
            add(hat(), t0 + i * b, 0.3)
    for i, m in enumerate(['D2', 'F2', 'A2', 'B2', 'G2', 'B2', 'D3', 'Db3', 'C3', 'E2', 'G2', 'B2']):
        add(sine(f(m), b * 1.1, decay=0.4) + 0.3 * sine(f(m) * 2, b * 1.1, decay=0.15), t0 + i * b, 0.7)
    chords = [['F3', 'A3', 'C4', 'E4'], ['F3', 'B3', 'E4', 'A4'], ['E3', 'G3', 'B3', 'D4']]
    for c, hits in zip(chords, [(1 + 2 / 3, 3), (0.66, 2 + 2 / 3), (0, 2)]):
        base = t0 + chords.index(c) * 4 * b
        for h in hits:
            for m in c:
                add(piano(f(m), 1.0, decay=0.5), base + h * b, 0.22, pan=-0.2)


def metal(t0, b):
    s16 = b / 4
    for i in range(12 * 4):
        add(kick(0.15, f0=180, decay=0.06), t0 + i * s16, 0.5)
    for i in range(12):
        if i % 2 == 1:
            add(snare(tone=220), t0 + i * b, 1.0)
    add(crash(), t0 + 8 * b, 0.4)
    riff = 'xxOxxxOx' 'xxOxOxOO' 'xxOxxxFG'
    E5, F5, G5 = [f('E2'), f('B2'), f('E3')], [f('F2'), f('C3'), f('F3')], [f('G2'), f('D3'), f('G3')]
    for i, c in enumerate(riff):
        at = t0 + i * b / 2
        if c == 'x':
            add(guitar(E5, b / 2), at, 0.5, pan=-0.3); add(guitar(E5, b / 2), at + 0.01, 0.5, pan=0.3)
        else:
            ch = {'O': E5, 'F': F5, 'G': G5}[c]
            add(guitar(ch, b, mute=False), at, 0.45, pan=-0.3); add(guitar(ch, b, mute=False), at + 0.01, 0.45, pan=0.3)
        add(sine(f('E1') if c != 'F' else f('F1'), b / 2, decay=0.2), at, 0.6)


def rnb(t0, b):
    s16 = b / 4
    for k in (0, 2.5, 4, 5.25):
        add(kick(decay=0.3, f0=110), t0 + k * b, 0.8)
    for k in (1, 3, 5):
        add(snap(), t0 + k * b, 0.7)
    for i in range(24):
        add(hat(), t0 + i * s16, 0.12 + 0.06 * (i % 2 == 0), pan=0.3)
    chords = [(['F3', 'A3', 'C4', 'E4', 'G4'], 'F1'), (['E3', 'G3', 'B3', 'D4'], 'E1'), (['D3', 'F3', 'A3', 'C4', 'E4'], 'D1')]
    for i, (c, r) in enumerate(chords):
        for j, m in enumerate(c):
            add(rhodes(f(m), 2.4), t0 + i * 2 * b + j * 0.015, 0.25)
        add(sine(f(r), 2 * b, decay=1.0, att=0.02), t0 + i * 2 * b, 0.8)
    for i, m in enumerate(['C5', 'A4', 'G4', 'B4', 'A4', 'G4']):
        add(rhodes(f(m), 1.2), t0 + i * b + b / 2, 0.15, pan=0.2)


def classical(t0, b):
    bars = [('C2', ['E3', 'G3', 'C4']), ('F2', ['F3', 'A3', 'C4']), ('G2', ['F3', 'G3', 'B3']), ('C2', ['E3', 'G3', 'C4'])]
    mel = [[('E5', 2), ('G5', 1)], [('A5', 2), ('F5', 1)], [('G5', 1), ('F5', 1), ('D5', 1)], [('C5', 3)]]
    for i, (root, ch) in enumerate(bars):
        tb = t0 + i * 3 * b
        add(piano(f(root), 1.5, decay=1.2), tb, 0.6, pan=-0.2)
        for k in (1, 2):
            for m in ch:
                add(piano(f(m), 0.6, decay=0.35), tb + k * b, 0.25, pan=-0.2)
        at = tb
        for m, ln in mel[i]:
            add(piano(f(m), ln * b + 0.6, decay=1.0), at, 0.5, pan=0.2)
            at += ln * b
        add(pad([f(m) for m in ch], 3 * b), tb, 0.5)


def folk(t0, b):
    G = ['G2', 'B2', 'D3', 'G3', 'B3', 'G4']; C = ['C3', 'E3', 'G3', 'C4', 'E4']
    D = ['D3', 'A3', 'D4', 'F#4']; Em = ['E2', 'B2', 'E3', 'G3', 'B3', 'E4']
    strum = [(0, 'd'), (1, 'd'), (1.5, 'u'), (2.5, 'u'), (3, 'd'), (3.5, 'u')]
    prog = [G, C, D, G]
    for bar in range(2):
        for at, dirn in strum:
            beat = bar * 4 + at
            ch = prog[int(beat // 2)]
            notes = ch if dirn == 'd' else ch[::-1][:4]
            for k, m in enumerate(notes):
                add(pluck(f(m), 1.2), t0 + beat * b + k * 0.012, 0.42 if dirn == 'd' else 0.25, pan=-0.15)
    for i in range(16):
        add(shaker(), t0 + i * b / 2, 0.5 if i % 2 else 0.3, pan=0.4)
    for k in range(0, 8, 2):
        add(kick(decay=0.15, f0=100), t0 + k * b, 0.9)


def square(t0, b, beats=10):
    for i in range(beats):
        add(kick(decay=0.22), t0 + i * b, 1.0)
        add(hat(open_=True), t0 + i * b + b / 2, 0.25)
        if i % 2 == 1:
            add(clap(), t0 + i * b, 0.7)
    roots = ['D2', 'D2', 'B1', 'B1', 'G1', 'G1', 'A1', 'A1', 'D2', 'D2']
    for i, r in enumerate(roots[:beats]):
        add(lead(f(r), b / 2) * 0.8 + sine(f(r), b / 2, decay=0.15)[:len(lead(f(r), b / 2))], t0 + i * b + b / 2, 0.8)
    mel = 'A5 A5 B5 A5 F#5 E5 D5 E5 F#5 F#5 A5 F#5 E5 D5 B4 D5 E5 F#5 D5 -'.split()
    for i, m in enumerate(mel):
        if m != '-':
            add(lead(f(m), b / 2 * 0.9), t0 + i * b / 2, 0.55, pan=0.15)


def outro(t0, b):
    hiphop(t0, b, beats=8, melody=False)
    for i, m in enumerate(['E5', 'D5', 'C5', 'A4', 'C5', 'D5', 'E5', 'A5']):
        add(pluck(f(m), 0.6), t0 + i * b, 0.3, pan=0.3)
    add(crash(3.0), t0 + 8 * b, 0.6)
    add(kick(decay=0.5), t0 + 8 * b, 1.0)
    add(pad([f('A2'), f('E3'), f('A3'), f('C4'), f('E4')], 2 * b + 0.5), t0 + 8 * b, 1.5)


FN = dict(intro=intro, hiphop=hiphop, jazz=jazz, metal=metal, rnb=rnb, classical=classical, folk=folk, square=square, outro=outro)
for s, st in zip(scenes, starts):
    b = 60 / s['bpm']
    FN[s['id']](st, b)
    if s['id'] not in ('intro',):  # 换曲风的卡点：前置 whoosh + 落地 crash
        add(whoosh(), st - 0.4, 0.3)
        add(crash(), st, 0.35)
        add(kick(decay=0.4, f0=90, f1=35), st, 0.7)

# 母带：限幅 + 归一化 + 淡出
end = int(TOTAL * SR)
out = buf[:end]
fade = int(0.6 * SR)
out[-fade:] *= np.linspace(1, 0, fade)[:, None]
out = np.tanh(out / np.max(np.abs(out)) * 1.6)
out = out / np.max(np.abs(out)) * 0.9
with wave.open('build/audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
print(f'audio.wav  {TOTAL:.2f}s')
