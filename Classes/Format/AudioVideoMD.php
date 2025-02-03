<?php

/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */

namespace Kitodo\Dlf\Format;

use Kitodo\Dlf\Common\MetadataInterface;

/**
 * Process AudioMD and VideoMD metadata.
 *
 * The technical reason for handling both formats here is that this makes it slightly more
 * straightforward to extract `duration` as either video duration or audio duration.
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class AudioVideoMD implements MetadataInterface
{
    /**
     * Extract some essential AudioMD/VideoMD metadata.
     *
     * @access public
     *
     * @param \SimpleXMLElement $xml The XML to extract the metadata from
     * @param array &$metadata The metadata array to fill
     * @param bool $useExternalApis true if external APIs should be called, false otherwise
     *
     * @return void
     */
    public function extractMetadata(\SimpleXMLElement $xml, array &$metadata, bool $useExternalApis = false): void
    {
        $xml->registerXPathNamespace('audiomd', 'http://www.loc.gov/audioMD/');
        $xml->registerXPathNamespace('videomd', 'http://www.loc.gov/videoMD/');

        $audioDuration = (string) $xml->xpath('./audiomd:audioInfo/audiomd:duration')[0];
        if (!empty($audioDuration)) {
            $metadata['audio_duration'] = [$audioDuration];
        }

        $videoDuration = (string) $xml->xpath('./videomd:videoInfo/videomd:duration')[0];
        if (!empty($videoDuration)) {
            $metadata['video_duration'] = [$videoDuration];
        }

        $metadata['duration'] = $metadata['video_duration'] ?: $metadata['audio_duration'] ?: [];

        $videoFrameRate = (string) $xml->xpath('./videomd:fileData/videomd:frameRate[@mode="Fixed"]')[0];
        if (!empty($videoFrameRate)) {
            $metadata['video_frame_rate'] = [$videoFrameRate];
        }

        if ($useExternalApis) {
            // TODO?
        }
    }
}
