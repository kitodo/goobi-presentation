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

use Kitodo\Dlf\Api\Orcid\Profile as OrcidProfile;
use Kitodo\Dlf\Api\Viaf\Profile as ViafProfile;
use Kitodo\Dlf\Common\MetadataInterface;
use Slub\Mods\Element\Name;
use Slub\Mods\ModsReader;

/**
 * Metadata MODS format class for the 'dlf' extension
 *
 * @package TYPO3
 * @subpackage dlf
 *
 * @access public
 */
class Mods implements MetadataInterface
{
    /**
     * @access private
     * @var \SimpleXMLElement The metadata XML
     **/
    private $xml;

    /**
     * @access private
     * @var ModsReader The metadata XML
     **/
    private $modsReader;

    /**
     * @access private
     * @var array The metadata array
     **/
    private $metadata;

    /**
     * @access private
     * @var bool The metadata array
     **/
    private $useExternalApis;

    /**
     * This extracts the essential MODS metadata from XML
     *
     * @access public
     *
     * @param \SimpleXMLElement $xml The XML to extract the metadata from
     * @param array &$metadata The metadata array to fill
     * @param bool $useExternalApis true if external APIs should be called, false otherwise
     *
     * @return void
     */
    public function extractMetadata(\SimpleXMLElement $xml, array &$metadata, bool $useExternalApis): void
    {
        $this->xml = $xml;
        $this->metadata = $metadata;
        $this->useExternalApis = $useExternalApis;

        $this->modsReader = new ModsReader($this->xml);

        $this->getAuthors();
        $this->getHolders();
        $this->getPlaces();
        $this->getProdPlaces();
        $this->getNamePersonal();
        $this->getYears();

        $metadata = $this->metadata;
    }

    /**
     * Get "author" and "author_sorting".
     *
     * @access private
     *
     * @return void
     */
    private function getAuthors(): void
    {
        $authors = $this->modsReader->getNames('[./mods:role/mods:roleTerm[@type="code" and @authority="marcrelator"]="aut"]');
        // Get "author" and "author_sorting" again if that was too sophisticated.
        if (empty($authors)) {
            // Get all names which do not have any role term assigned and assume these are authors.
            $authors = $this->modsReader->getNames('[not(./mods:role)]');
        }
        if (!empty($authors)) {
            for ($i = 0, $j = count($authors); $i < $j; $i++) {
                $identifiers = $authors[$i]->getNameIdentifiers('[@type="orcid"]');
                if ($this->useExternalApis && !empty($identifiers)) {
                    $this->getAuthorFromOrcidApi($identifiers[0]->getValue(), $authors, $i);
                } else {
                    $this->getAuthorFromXml($authors, $i);
                }
            }
        }
    }

    /**
     * Get author from ORCID API.
     *
     * @access private
     *
     * @param string $orcidId
     * @param array $authors
     * @param int $i
     *
     * @return void
     */
    private function getAuthorFromOrcidApi(string $orcidId, array $authors, int $i): void
    {
        $profile = new OrcidProfile($orcidId);
        $name = $profile->getFullName();
        if (!empty($name)) {
            $this->metadata['author'][$i] = [
                'name' => $name,
                'url' => 'https://orcid.org/' . $orcidId
            ];
        } else {
            //fallback into display form
            $this->getAuthorFromXmlDisplayForm($authors, $i);
        }
    }

    /**
     * Get author from XML.
     *
     * @access private
     *
     * @param array $authors
     * @param int $i
     *
     * @return void
     */
    private function getAuthorFromXml(array $authors, int $i): void
    {
        $this->getAuthorFromXmlDisplayForm($authors, $i);

        $nameParts = $authors[$i]->getNameParts();
        if (empty($this->metadata['author'][$i]) && $nameParts) {
            $name = [];
            $k = 4;
            foreach ($nameParts as $namePart) {
                if (
                    !empty($namePart->getType())
                    && $namePart->getType() == 'family'
                ) {
                    $name[0] = $namePart->getValue();
                } elseif (
                    !empty($namePart->getType())
                    && $namePart->getType() == 'given'
                ) {
                    $name[1] = $namePart->getValue();
                } elseif (
                    !empty($namePart->getType())
                    && $namePart->getType() == 'termsOfAddress'
                ) {
                    $name[2] = $namePart->getValue();
                } elseif (
                    !empty($namePart->getType())
                    && $namePart->getType() == 'date'
                ) {
                    $name[3] = $namePart->getValue();
                } else {
                    $name[$k] = $namePart->getValue();
                }
                $k++;
            }
            ksort($name);
            $this->metadata['author'][$i] = trim(implode(', ', $name));
        }
        // Append "valueURI" to name using Unicode unit separator.
        if (!empty($authors[$i]->getValueURI())) {
            $this->metadata['author'][$i] .= pack('C', 31) . $authors[$i]->getValueURI();
        }
    }

    /**
     * Get author from XML display form.
     *
     * @access private
     *
     * @param Name[] $authors
     * @param int $i
     *
     * @return void
     */
    private function getAuthorFromXmlDisplayForm(array $authors, int $i): void
    {
        $displayForms = $authors[$i]->getDisplayForms();
        if ($displayForms) {
            $this->metadata['author'][$i] = $displayForms[0]->getValue();
        }
    }

    /**
     * Get holder.
     *
     * @access private
     *
     * @return void
     */
    private function getHolders(): void
    {
        $holders = $this->modsReader->getNames('[./mods:role/mods:roleTerm[@type="code" and @authority="marcrelator"]="prv"]');

        if (!empty($holders)) {
            for ($i = 0, $j = count($holders); $i < $j; $i++) {
                $identifiers = $holders[$i]->getNameIdentifiers('[@type="viaf"]');
                if ($this->useExternalApis && !empty($identifiers)) {
                    $this->getHolderFromViafApi($identifiers[0]->getValue(), $holders, $i);
                } else {
                    $this->getHolderFromXml($holders, $i);
                }
            }
        }
    }

    /**
     * Get holder from VIAF API.
     *
     * @access private
     *
     * @param string $viafId
     * @param array $holders
     * @param int $i
     *
     * @return void
     */
    private function getHolderFromViafApi(string $viafId, array $holders, int $i): void
    {
        $profile = new ViafProfile($viafId);
        $name = $profile->getFullName();
        if (!empty($name)) {
            $this->metadata['holder'][$i] = [
                'name' => $name,
                'url' => 'http://viaf.org/viaf/' . $viafId
            ];
        } else {
            //fallback into display form
            $this->getHolderFromXmlDisplayForm($holders, $i);
        }
    }

    /**
     * Get holder from XML.
     *
     * @access private
     *
     * @param array $holders
     * @param int $i
     *
     * @return void
     */
    private function getHolderFromXml(array $holders, int $i): void
    {
        $this->getHolderFromXmlDisplayForm($holders, $i);
        // Append "valueURI" to name using Unicode unit separator.
        if (!empty($holders[$i]->getValueURI())) {
            $this->metadata['holder'][$i] .= pack('C', 31) . $holders[$i]->getValueURI();
        }
    }

    /**
     * Get holder from XML display form.
     *
     * @access private
     *
     * @param array $holders
     * @param int $i
     *
     * @return void
     */
    private function getHolderFromXmlDisplayForm(array $holders, int $i): void
    {
        // Check if there is a display form.
        $displayForms = $holders[$i]->getDisplayForms();
        if ($displayForms) {
            $this->metadata['holder'][$i] = $displayForms[0]->getValue();
        }
    }

    /**
     * Get "place" and "place_sorting".
     *
     * @access private
     *
     * @return void
     */
    private function getPlaces(): void
    {
        $places = [];
        $originInfos = $this->modsReader->getOriginInfos('[not(./mods:edition="[Electronic ed.]")]');
        foreach ($originInfos as $originInfo) {
            foreach ($originInfo->getPlaces() as $place) {
                foreach ($place->getPlaceTerms() as $placeTerm) {
                    $places[] = $placeTerm->getValue();
                }
            }
        }

        // Get "place" and "place_sorting" again if that was to sophisticated.
        if (empty($places)) {
            // Get all places and assume these are places of publication.
            $originInfos = $this->modsReader->getOriginInfos();
            foreach ($originInfos as $originInfo) {
                foreach ($originInfo->getPlaces() as $place) {
                    foreach ($place->getPlaceTerms() as $placeTerm) {
                        $places[] = $placeTerm->getValue();
                    }
                }
            }
        }

        if (!empty($places)) {
            foreach ($places as $place) {
                $this->metadata['place'][] = $place;
                if (empty($this->metadata['place_sorting'][0])) {
                    $this->metadata['place_sorting'][0] = preg_replace('/[[:punct:]]/', '', $place);
                }
            }
        }
    }

    /**
     * Get MODS production places to allow linking valueURI
     *
     * @access private
     *
     * @return void
     */
    private function getProdPlaces(): void
    {
        $relatedItems = $this->modsReader->getRelatedItems('[@type="original"]');
        foreach ($relatedItems as $relatedItem) {
                $originInfos = $relatedItem->getOriginInfos('[@eventType="production"]');
                foreach ($originInfos as $originInfo) {
                        foreach ($originInfo->getPlaces() as $prodPlaces) {
                            foreach ($prodPlaces->getPlaceTerms() as $prodPlaceTerm) {
                                $prodPlaceMd = $prodPlaceTerm->getValue();

                                if (!empty($prodPlaceTerm->getValueURI())) {
                                    $prodPlaceMd .= pack('C', 31) . $prodPlaceTerm->getValueURI();
                                }

                                $this->metadata['production_place'][] = $prodPlaceMd;
                            }
                        }
                }
        }
    }

    /**
     * Get MODS personal names to allow linking valueURI
     *
     * @access private
     *
     * @return void
     */
    private function getNamePersonal(): void
    {
        $namePersonal = $this->modsReader->getNames('[@type="personal"]');

        foreach ($namePersonal as $person) {
            $roles = $person->getRoles();
            if (empty($roles)) {
                continue;
            }
            $roleCodes = $roles[0]->getRoleTerms('[@type="code" and @authority="marcrelator"]');
            $roleTexts = $roles[0]->getRoleTerms('[@type="text"]');

            if (empty($roleCodes) || empty($roleCodes[0]->getValue())) {
                continue;
            }
            $roleCode = $roleCodes[0]->getValue();

            $roleText = !empty($roleTexts) ? $roleTexts[0]->getValue() : '';

            $displayForms = $person->getDisplayForms();
            $personDisplayForm = !empty($displayForms) ? $displayForms[0]->getValue() : '';

            $valueURI = $person->getValueURI() ?? '';

            $personMd = implode(pack('C', 31), [
                $personDisplayForm,
                $valueURI,
                $roleText,
                $roleCode,
            ]);

            $this->metadata['name_personal_' . $roleCode][] = $personMd;
        }
    }

    /**
     * Get "year" and "year_sorting".
     *
     * @access private
     *
     * @return void
     */
    private function getYears(): void
    {
        // Get "year_sorting".
        $yearsSorting = $this->modsReader->getOriginInfos('[not(./mods:edition="[Electronic ed.]")]/mods:dateOther[@type="order" and @encoding="w3cdtf"]');
        if ($yearsSorting) {
            foreach ($yearsSorting as $yearSorting) {
                $otherDates = $yearSorting->getOtherDates();
                if (!empty($otherDates)) {
                    $this->metadata['year_sorting'][0] = $otherDates[0]->getValue();
                }
            }
        }
        // Get "year" and "year_sorting" if not specified separately.
        $years = $this->modsReader->getOriginInfos('./mods:originInfo[not(./mods:edition="[Electronic ed.]")]/mods:dateIssued[@keyDate="yes"]');
        // Get "year" and "year_sorting" again if that was to sophisticated.
        if (empty($years)) {
            // Get all dates and assume these are dates of publication.
            $years = $this->modsReader->getOriginInfos();
        }
        if (!empty($years)) {
            foreach ($years as $year) {
                $issued = $year->getIssuedDates();
                if (!empty($issued)) {
                    $this->metadata['year'][] = $issued[0]->getValue();
                    if (empty($this->metadata['year_sorting'][0])) {
                        $yearSorting = str_ireplace('x', '5', preg_replace('/[^\d.x]/i', '', $issued[0]->getValue()));
                        if (
                            strpos($yearSorting, '.')
                            || strlen($yearSorting) < 3
                        ) {
                            $yearSorting = (((int) trim($yearSorting, '.') - 1) * 100) + 50;
                        }
                        $this->metadata['year_sorting'][0] = (int) $yearSorting;
                    }
                }
            }
        }
    }
}
