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

 namespace Kitodo\Dlf\Command\DbDocs;

/**
 * Simple utility to write .rst (reStructuredText).
 *
 * @author Kajetan Dvoracek <kajetan.dvoracek@slub-dresden.de>
 * @package TYPO3
 * @subpackage dlf
 * @access public
 */
class RstSection
{
    /** @var string */
    protected $header = '';

    /** @var string */
    protected $text = '';

    /** @var RstSection[] */
    protected $subsections = [];

    public static function format(string $text, array $format = [])
    {
        if (!empty($text)) {
            if ($format['bold'] ?? false) {
                $text = '**' . $text . '**';
            } elseif ($format['italic'] ?? false) {
                $text = '*' . $text . '*';
            }
        }

        return $text;
    }

    public static function paragraphs(array $paragraphs)
    {
        $paragraphs = array_values(array_filter($paragraphs, function ($entry) {
            return !empty($entry);
        }));

        return implode("\n\n", $paragraphs);
    }

    public function subsection()
    {
        $section = new static();
        $this->subsections[] = $section;
        return $section;
    }

    public function setHeader(string $text)
    {
        $this->header = $text;
    }

    public function addText(string $text)
    {
        if (!empty($text)) {
            $this->text .= $text . "\n\n";
        }
    }

    public function addTable(array $rows, array $headerRows)
    {
        $numHeaderRows = count($headerRows);

        $tableRst = <<<RST
.. t3-field-list-table::
   :header-rows: $numHeaderRows


RST;

        // Pattern for a row:
        //
        // - :key1:      value
        //   :key2:      another
        //               value that may
        //               span multiple lines
        //
        foreach (array_merge($headerRows, $rows) as $row) {
            $entry = '';
            foreach ($row as $key => $value) {
                $valueLines = explode("\n", $value);
                $numLines = count($valueLines);
                for ($i = 0; $i < $numLines; $i++) {
                    $prefix = $i === 0
                        ? '     :' . $key . ':'
                        : '';

                    $entry .= str_pad($prefix, 32) . trim($valueLines[$i]) . "\n";
                }
            }

            if (!empty($entry)) {
                $entry[3] = '-';
                $entry .= "\n";
            }

            $tableRst .= $entry;
        }

        $this->addText($tableRst);
    }

    public function render(int $level = 0)
    {
        $result = '';

        $result .= $this->renderHeader($level);
        $result .= $this->text;

        foreach ($this->subsections as $section) {
            $result .= $section->render($level + 1);
            $result .= "\n";
        }

        return $result;
    }

    protected function renderHeader(int $level)
    {
        $result = '';

        $headerChar = ['=', '=', '-', '~', '"'][$level];
        $headerSep = str_repeat($headerChar, mb_strlen($this->header));

        if ($level === 0) {
            $result .= $headerSep . "\n";
        }

        $result .= $this->header . "\n" . $headerSep . "\n\n";

        return $result;
    }
}
