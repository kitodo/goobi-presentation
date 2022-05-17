#!/usr/bin/bash

FROM="../slub_web_sachsendigital/"
TO="./"

cp "$FROM/jsconfig.json" "$TO/jsconfig.json"

cp "$FROM/Build/.nvmrc" "$TO/Build"
cp "$FROM/Build/babel.config.js" "$TO/Build"
cp "$FROM/Build/.eslintrc.compat.js" "$TO/Build"
cp "$FROM/Build/.eslintrc.compat-build.js" "$TO/Build"

cp -a "$FROM/Resources/Private/JavaScript/lib" "$TO/Resources/Private/JavaScript"
cp -a "$FROM/Resources/Private/JavaScript/DlfMediaPlayer" "$TO/Resources/Private/JavaScript"
cp -a "$FROM/Resources/Private/JavaScript/SlubMediaPlayer" "$TO/Resources/Private/JavaScript"
cp -a "$FROM/Resources/Private/JavaScript/style-mock.js" "$TO/Resources/Private/JavaScript"

cp -a "$FROM/Resources/Private/Less/DlfMediaPlayer" "$TO/Resources/Private/Less"
cp -a "$FROM/Resources/Private/Less/SlubMediaPlayer" "$TO/Resources/Private/Less"

cp -a "$FROM/Resources/Private/Language/locallang_video.xlf" "$TO/Resources/Private/Language/locallang_media.xlf"
cp -a "$FROM/Resources/Private/Language/de.locallang_video.xlf" "$TO/Resources/Private/Language/de.locallang_media.xlf"
