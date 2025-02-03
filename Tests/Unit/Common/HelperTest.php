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

namespace Kitodo\Dlf\Tests\Unit\Common;

use Kitodo\Dlf\Common\Helper;
use TYPO3\TestingFramework\Core\Unit\UnitTestCase;

class HelperTest extends UnitTestCase
{
    public function assertInvalidXml($xml)
    {
        $result = Helper::getXmlFileAsString($xml);
        self::assertEquals(false, $result);
    }

    /**
     * @test
     * @group getXmlFileAsString
     */
    public function invalidXmlYieldsFalse(): void
    {
        self::assertInvalidXml(false);
        self::assertInvalidXml(null);
        self::assertInvalidXml(1);
        self::assertInvalidXml([]);
        self::assertInvalidXml(new \stdClass());
        self::assertInvalidXml('');
        self::assertInvalidXml('not xml');
        self::assertInvalidXml('<tag-not-closed>');
    }

    /**
     * @test
     * @group getXmlFileAsString
     */
    public function validXmlIsAccepted(): void
    {
        $xml = <<<XML
<?xml version="1.0" encoding="UTF-8"?>
<root>
    <single />
</root>
XML;
        $node = Helper::getXmlFileAsString($xml);
        self::assertIsObject($node);
        self::assertEquals('root', $node->getName());
    }

    /**
     * @test
     * @group timecodeToSeconds
     */
    public function canConvertTimecode()
    {
        $this->assertEquals(20, Helper::timecodeToSeconds('20'));
        $this->assertEquals(20.5, Helper::timecodeToSeconds('20.5'));
        $this->assertEquals(80.5, Helper::timecodeToSeconds('1:20.5'));
    }
}
