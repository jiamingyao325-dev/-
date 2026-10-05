#!/usr/bin/env bash
# 出片检查：找出「画面上没有任何墨迹」持续 0.3 秒以上的空白段，以及配乐的静音段。
# 用法：bash vibe-kit/qa.sh <视频文件> [--dark]   暗场片子加 --dark：亮的像素（纸、竹简、浅色字）才算有内容
set -euo pipefail
f="$1"
lut="if(lt(val,110),255,0)"
[ "${2:-}" = "--dark" ] && lut="if(gt(val,110),255,0)"
echo "== $f  时长 $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f") 秒"

# 只看页眉以下、字幕以上加字幕区（y 160–1460）；深色像素（墨、朱红）记为白，其余为黑，
# 再用 blackframe 找出几乎全黑（即没有墨迹）的帧
blank=$(ffmpeg -v info -i "$f" -an -vf "crop=1080:1300:0:160,lutyuv=y='$lut':u=128:v=128,blackframe=amount=99.97:threshold=32" -f null - 2>&1 \
  | grep -o 't:[0-9.]*' | cut -d: -f2 || true)
if [ -z "$blank" ]; then
  echo "空白画面：无"
else
  echo "$blank" | awk 'NR==1{s=$1;p=$1;next} {if($1-p>0.05){if(p-s>=0.3)printf "空白画面：%.1f–%.1f 秒\n",s,p; s=$1} p=$1} END{if(p-s>=0.3)printf "空白画面：%.1f–%.1f 秒\n",s,p}'
fi

sil=$(ffmpeg -i "$f" -vn -af silencedetect=n=-50dB:d=0.4 -f null - 2>&1 | grep -o 'silence_start: [0-9.]*' || true)
echo "${sil:-配乐静音段：无}"
