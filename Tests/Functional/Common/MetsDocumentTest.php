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

namespace Kitodo\Dlf\Tests\Functional\Common;

use Kitodo\Dlf\Common\AbstractDocument;
use Kitodo\Dlf\Tests\Functional\FunctionalTestCase;

class MetsDocumentTest extends FunctionalTestCase
{
    public function setUp(): void
    {
        parent::setUp();

        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/documents_1.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/Common/metadata.csv');
        $this->importCSVDataSet(__DIR__ . '/../../Fixtures/MetsDocument/metadata_mets.csv');
    }

    protected function doc(string $file)
    {
        $url = 'http://web:8001/Tests/Fixtures/MetsDocument/' . $file;
        $doc = AbstractDocument::getInstance($url, ['general' => ['useExternalApisForMetadata' => 0]]);
        self::assertNotNull($doc);
        return $doc;
    }

    /**
     * @test
     */
    public function canParseDmdAndAmdSec()
    {
        $doc = $this->doc('av_beispiel.xml');

        $toplevelMetadata = $doc->getToplevelMetadata(20000);

        self::assertEquals(['Odol-Mundwasser, 3 Werbespots'], $toplevelMetadata['title']);
        self::assertEquals(['24'], $toplevelMetadata['frame_rate']);
        self::assertEquals(['Sächsische Landesbibliothek - Staats- und Universitätsbibliothek Dresden'], $toplevelMetadata['dvrights_owner']);
        self::assertEquals(['https://katalog.slub-dresden.de/id/0-1703800435'], $toplevelMetadata['dvlinks_reference']);

        self::assertEquals([
            'DMDLOG_0000' => $doc->mdSec['DMDLOG_0000'],
        ], $doc->dmdSec);
    }

    /**
     * @test
     */
    public function canReadFileMetadata()
    {
        $doc = $this->doc('av_beispiel.xml');

        $thumbsMeta = $doc->getMetadata('FILE_0000_THUMBS', 20000);
        self::assertEquals($thumbsMeta, []);

        $videoMeta = $doc->getMetadata('FILE_0000_DEFAULT_MOV', 20000);
        self::assertArrayMatches([
            'frame_rate' => ['24'],
        ], $videoMeta);
    }

    /**
     * @test
     */
    public function canGetLogicalStructure()
    {
        $doc = $this->doc('av_beispiel.xml');

        $toc = $doc->tableOfContents[0] ?? [];

        self::assertArrayMatches([
            'dmdId' => 'DMDLOG_0000',
            'admId' => 'AMD',
            'videoChapter' => [
                'fileId' => 'FILE_0000_DEFAULT_MOV',
                'timecode' => 0,
            ],
            'children' => [
                [
                    'id' => 'LOG_0001',
                    'dmdId' => '',
                    'admId' => '',
                    'videoChapter' => [
                        'fileId' => 'FILE_0000_DEFAULT_MOV',
                        'timecode' => 0,
                    ],
                ],
                [
                    'id' => 'LOG_0002',
                    'dmdId' => '',
                    'admId' => '',
                    'videoChapter' => [
                        'fileId' => 'FILE_0000_DEFAULT_MOV',
                        'timecode' => 20.5,
                    ],
                ],
                [
                    'id' => 'LOG_0003',
                    'dmdId' => '',
                    'admId' => '',
                    'videoChapter' => [
                        'fileId' => 'FILE_0000_DEFAULT_MOV',
                        'timecode' => 40,
                    ],
                ],
                [
                    'id' => 'LOG_0004',
                    'dmdId' => '',
                    'admId' => '',
                    'videoChapter' => [
                        'fileId' => 'FILE_0000_DEFAULT_MOV',
                        'timecode' => 60,
                    ],
                ],
            ],
        ], $toc, 'Expected TOC to contain the specified values');
    }

    /**
     * @test
     */
    public function canReadChapterArea()
    {
        $doc = $this->doc('av_beispiel.xml');

        $ch3_page = $doc->physicalStructureInfo[$doc->physicalStructure[3]];
        $this->assertArrayMatches([
            'DEFAULT' => 'FILE_0000_DEFAULT_MP4',
        ], $ch3_page['files']);
        $this->assertArrayMatches([
            'DEFAULT' => [
                'FILE_0000_DEFAULT_MOV',
                'FILE_0000_DEFAULT_MP4',
            ],
        ], $ch3_page['all_files']);
        $this->assertArrayMatches([
            'FILE_0000_DEFAULT_MP4' => [
                'area' => [
                    'begin' => '00:00:40',
                    'betype' => 'TIME',
                    'extent' => '00:00:20',
                    'exttype' => 'TIME',
                ],
            ],
        ], $ch3_page['fileInfos']);
    }

    /**
     * @test
     */
    public function doesNotOverwriteFirstDmdSec()
    {
        $doc = $this->doc('two_dmdsec.xml');

        $toplevelMetadata = $doc->getToplevelMetadata(20000);
        $toc = $doc->tableOfContents[0] ?? [];

        self::assertEquals('DMDLOG_0000 DMDLOG_0000b', $toc['dmdId']); // TODO: Do we want the raw (non-split) value here?
        self::assertEquals('Test Value in DMDLOG_0000', $toplevelMetadata['test_value'][0]);
    }

    /**
     * @test
     */
    public function returnsEmptyMetadataWhenNoDmdSec()
    {
        $doc = $this->doc('two_dmdsec.xml');

        // DMD and AMD works
        $metadata = $doc->getMetadata('LOG_0000', 20000);
        self::assertEquals('Test Value in DMDLOG_0000', $metadata['test_value'][0]);

        // DMD only works
        $metadata = $doc->getMetadata('LOG_0001', 20000);
        self::assertEquals(['Test Value in DMDLOG_0000b'], $metadata['test_value']);

        // AMD only does not work
        $metadata = $doc->getMetadata('LOG_0002', 20000);
        self::assertEquals([], $metadata);
    }

    /**
     * @test
     */
    public function canGetDownloadLocation()
    {
        $doc = $this->doc('two_dmdsec.xml');

        $correct = $doc->getDownloadLocation('FILE_0000_DOWNLOAD');
        self::assertEquals('https://example.com/download?&CVT=jpeg', $correct);

        /*
         * The method `getDownloadLocation` should return a string, but returns null in some cases.
         * Therefore, a TypeError must be expected here.
         */
        $this->expectException('TypeError');
        $doc->getDownloadLocation('ID_DOES_NOT_EXIST');
    }


    /**
     * @test
     */
    public function canGetFileLocation()
    {
        $doc = $this->doc('two_dmdsec.xml');

        $correct = $doc->getFileLocation('FILE_0000_DEFAULT');
        self::assertEquals('https://digital.slub-dresden.de/data/kitodo/1703800435/video.mov', $correct);

        $incorrect = $doc->getFileLocation('ID_DOES_NOT_EXIST');
        self::assertEquals('', $incorrect);
    }

    /**
     * @test
     */
    public function canGetFileMimeType()
    {
        $doc = $this->doc('two_dmdsec.xml');

        $correct = $doc->getFileMimeType('FILE_0000_DEFAULT');
        self::assertEquals('video/quicktime', $correct);

        $incorrect = $doc->getFileMimeType('ID_DOES_NOT_EXIST');
        self::assertEquals('', $incorrect);
    }

    // FIXME: Method getPhysicalPage does not work as expected
    /**
     * @test
     */
    public function canGetPhysicalPage()
    {
        $doc = $this->doc('mets_with_pages.xml');

        // pass orderlabel and retrieve order
        $physicalPage = $doc->getPhysicalPage('1');
        self::assertEquals(1, $physicalPage);
    }

    /**
     * @test
     */
    public function canGetTitle()
    {
        $doc = $this->doc('mets_with_pages.xml');

        $correct = $doc->getTitle(1001);
        self::assertEquals('10 Keyboard pieces - Go. S. 658', $correct);

        $incorrect = $doc->getTitle(1234);
        self::assertEquals('', $incorrect);
    }

    /**
     * @test
     */
    public function canGetFullText()
    {
        $doc = $this->doc('mets_with_pages.xml');

        $fulltext = $doc->getFullText('PHYS_0003');
        $expected = '<?xml version="1.0"?>
<ocr><b/><b/></ocr>
';
        self::assertEquals($expected, $fulltext);

        $incorrect = $doc->getFullText('ID_DOES_NOT_EXIST');
        self::assertEquals('', $incorrect);
    }

    /**
     * @test
     */
    public function canGetStructureDepth()
    {
        $doc = $this->doc('mets_with_pages.xml');

        $correct = $doc->getStructureDepth('LOG_0001');
        self::assertEquals(3, $correct);

        $incorrect = $doc->getStructureDepth('ID_DOES_NOT_EXIST');
        self::assertFalse($incorrect);
    }
}
