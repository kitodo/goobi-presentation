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

namespace Kitodo\Dlf\Tests\Unit\Format;

use Kitodo\Dlf\Format\AudioVideoMD;
use TYPO3\TestingFramework\Core\Unit\UnitTestCase;

class AudioVideoMDTest extends UnitTestCase
{
    protected $metadata = [];

    public function setUp(): void
    {
        parent::setUp();

        $this->metadata = [
            'duration' => [],
            'video_duration' => [],
            'audio_duration' => [],
            'video_frame_rate' => []
        ];
    }

    /**
     * @test
     * @group extractMetadata
     */
    public function canExtractDuration(): void
    {
        $xml = simplexml_load_file(__DIR__ . '/../../Fixtures/Format/audioVideo.xml');
        $audioVideoMD = new AudioVideoMD();

        $videoXml = $xml->xpath('//mets:xmlData')[0];

        $audioVideoMD->extractMetadata($videoXml, $this->metadata);

        self::assertEquals(
            [
                'duration' => ["00:01:30.07"],
                'video_duration' => ["00:01:30.07"],
                'audio_duration' => ["01:10:35.08"],
                'video_frame_rate' => ["24"]
            ],
            $this->metadata
        );
    }
}
