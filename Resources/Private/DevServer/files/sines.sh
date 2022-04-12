#!/usr/bin/env bash

ffmpeg -y \
	-f lavfi -i "sine=frequency=100:duration=60" \
	-f lavfi -i "sine=frequency=125:duration=60" \
	-f lavfi -i "sine=frequency=160:duration=60" \
	-f lavfi -i "sine=frequency=200:duration=60" \
	-f lavfi -i "sine=frequency=250:duration=60" \
	-f lavfi -i "sine=frequency=315:duration=60" \
	-f lavfi -i "sine=frequency=400:duration=60" \
	-f lavfi -i "sine=frequency=500:duration=60" \
	-f lavfi -i "sine=frequency=630:duration=60" \
	-f lavfi -i "sine=frequency=800:duration=60" \
	-f lavfi -i "sine=frequency=1000:duration=60" \
	-f lavfi -i "sine=frequency=1250:duration=60" \
	-f lavfi -i "sine=frequency=1600:duration=60" \
	-f lavfi -i "sine=frequency=2000:duration=60" \
	-f lavfi -i "sine=frequency=2500:duration=60" \
	-f lavfi -i "sine=frequency=3150:duration=60" \
	-f lavfi -i "sine=frequency=4000:duration=60" \
	-f lavfi -i "sine=frequency=5000:duration=60" \
	-f lavfi -i "sine=frequency=6300:duration=60" \
	-f lavfi -i "sine=frequency=8000:duration=60" \
	-f lavfi -i "sine=frequency=10000:duration=60" \
	-f lavfi -i "sine=frequency=12500:duration=60" \
	-f lavfi -i "sine=frequency=16000:duration=60" \
	-f lavfi -i "sine=frequency=20000:duration=60" \
	-filter_complex "amix=inputs=24[merged];[merged]volume=-18dB" \
	sines.flac
