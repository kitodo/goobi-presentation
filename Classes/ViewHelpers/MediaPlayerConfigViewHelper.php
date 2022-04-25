<?php
namespace Kitodo\Dlf\ViewHelpers;

/**
 * (c) Kitodo. Key to digital objects e.V. <contact@kitodo.org>
 *
 * This file is part of the Kitodo and TYPO3 projects.
 *
 * @license GNU General Public License version 3 or later.
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 */
use TYPO3Fluid\Fluid\Core\Rendering\RenderingContextInterface;
use TYPO3Fluid\Fluid\Core\ViewHelper\AbstractViewHelper;
use TYPO3\CMS\Core\Localization\LocalizationFactory;
use TYPO3\CMS\Core\Utility\GeneralUtility;
use TYPO3\CMS\Core\Utility\PathUtility;
use TYPO3\CMS\Extbase\Utility\LocalizationUtility;

/**
 * This view helper serializes media player configuration to JSON and makes it
 * available as a variable to be passed to the player.
 */
class MediaPlayerConfigViewHelper extends AbstractViewHelper
{
    protected $escapeOutput = false;

    public function initializeArguments()
    {
        $this->registerArgument('id', 'string', 'ID of the generated player configuration', true);
        $this->registerArgument('settings', 'array', 'the settings array that is converted to JSON', true);
    }

    public static function renderStatic(
        array $arguments,
        \Closure $renderChildrenClosure,
        RenderingContextInterface $renderingContext
    ) {
        $id = $arguments['id'];
        $inputSettings = $arguments['settings'];

        // Whitelist keys to keep out stuff such as playerTranslationsFile
        $allowedKeys = ['shareButtons', 'screenshotCaptions', 'constants'];
        $result = array_intersect_key($inputSettings, array_flip($allowedKeys));

        // Add translations
        $result['lang'] = self::getTranslations($inputSettings['playerTranslations']['baseFile'] ?? 'EXT:dlf/Resources/Private/Language/locallang_media.xlf');

        // Resolve paths
        foreach ($result['shareButtons'] ?? [] as &$button) {
            if ($button['type'] === 'image') {
                $filePath = GeneralUtility::getFileAbsFileName($button['src']);
                $webPath = PathUtility::getAbsoluteWebPath($filePath);

                $button['src'] = $webPath;
            }
        }

        // Allow using (and overriding) non-numeric keys for shareButtons
        $result['shareButtons'] = array_values($result['shareButtons'] ?? []);

        $idJson = json_encode($id);
        $resultJson = json_encode($result);

        return <<<CONFIG
<script>
    window[$idJson] = $resultJson;
</script>
CONFIG;
    }

    /**
     * Collect translation keys from the specified XLIFF file and translate them
     * using the current language.
     *
     * Keys of the result array:
     * - locale: Locale identifier of current site language
     * - twoLetterIsoCode: Two-letter ISO code of current site language
     * - phrases: Map from translation keys to their translations
     */
    private static function getTranslations(string $baseTranslationFile)
    {
        $language = $GLOBALS['TYPO3_REQUEST']->getAttribute('language');
        $languageKey = $language->getTypo3Language();

        // Grab available translation keys from the specified file
        $localizationFactory = GeneralUtility::makeInstance(LocalizationFactory::class);
        $translationKeys = array_keys($localizationFactory->getParsedData($baseTranslationFile, 'default')['default']);

        // Translate each available key as per the current language.
        // - This falls back to default language if a key isn't translated
        // - Pass $languageKey to ensure that translation matches ISO code
        $phrases = [];
        foreach ($translationKeys as $transKey) {
            $phrases[$transKey] = LocalizationUtility::translate(
                "LLL:$baseTranslationFile:$transKey",
                /* extensionName= */null,
                /* arguments= */null,
                $languageKey
            );
        }

        return [
            'locale' => $language->getLocale(),
            'twoLetterIsoCode' => $language->getTwoLetterIsoCode(),
            'phrases' => $phrases,
        ];
    }
}
