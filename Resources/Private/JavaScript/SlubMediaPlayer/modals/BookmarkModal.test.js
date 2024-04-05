/**
 * @jest-environment jsdom
 */

// @ts-check

import { jest, beforeEach, afterEach, describe, expect, it, test } from '@jest/globals';
import BookmarkModal from './BookmarkModal';
import UrlGenerator from '../lib/UrlGenerator';

describe('BookmarkModal', () => {
  /**
   * @type {BookmarkModal}
   */
  let bookmarkModal;
  let mockElement;
  let mockEnv;
  let mockConfig;
  /**
   * @type {((url?: string | URL | undefined, target?: string | undefined, features?: string | undefined) => Window | null) & ((url?: string | URL | undefined, target?: string | undefined, features?: string | undefined) => Window | null)}
   */
  let originalOpen;

  beforeEach(() => {
    // Mocking the environment and necessary elements for BookmarkModal
    mockElement = document.createElement('div');
    // const env = { t: jest.fn(), mkid: jest.fn() };
    mockEnv = {
      t: jest.fn().mockImplementation((key) => key),
      mkid: jest.fn().mockReturnValue('mockId'),
      getLocation: jest.fn().mockReturnValue(new URL('https://sachsen.digital')),
    };
    mockConfig = {
      shareButtons: [
        {
          label: 'Share',
          icon: 'share',
          href: 'dlf:qr_code',
        },
        {
          label: 'Mastodon',
          icon: 'mastodon',
          href: 'dlf:mastodon_share',
        },
      ],
    };
    bookmarkModal = new BookmarkModal(mockElement, mockEnv, mockConfig);
    originalOpen = window.open;
    window.open = jest.fn();
    global.alert = jest.fn();
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  test('test_generateUrl', () => {
    const state = {
      timing: {
        currentTime: 132.279743,
        markerRange: null,
      },
      fps: 25,
      startAtMode: 'current-time',
      showQrCode: false,
      showMastodonShare: false,
    };
    const expectedUrl = 'https://sachsen.digital/?timecode=132.279743';
    const generatedUrl = bookmarkModal.generateUrl(state);
    expect(generatedUrl).toBe(expectedUrl);
  });

  describe('renderMastodonShare', () => {
    it('should correctly add and remove the "dlf-visible" class based on the value of showMastodonShare', () => {
      bookmarkModal.renderMastodonShare(true);
      expect(bookmarkModal.$mastodonShareDialog.classList.contains('dlf-visible')).toBe(true);
      expect(bookmarkModal.$urlLine.classList.contains('dlf-visible')).toBe(false);

      bookmarkModal.renderMastodonShare(false);
      expect(bookmarkModal.$mastodonShareDialog.classList.contains('dlf-visible')).toBe(false);
      expect(bookmarkModal.$urlLine.classList.contains('dlf-visible')).toBe(true);
    });
  });

  test('test_openShareUrl_with_valid_parameters', () => {
    const instanceUrl = 'https://mastodon.social';
    const linkUrl = 'https://sachsen.digital';
    const pageTitle = 'Mediaplayer Test Page';

    bookmarkModal.openShareUrl(instanceUrl, linkUrl, pageTitle);

    let params = new URLSearchParams();
    params.set("text", pageTitle);

    expect(window.open).toHaveBeenCalledWith(expect.stringContaining(instanceUrl), "_blank");
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining(encodeURIComponent(linkUrl)), "_blank");
    expect(window.open).toHaveBeenCalledWith(expect.stringContaining(params.toString()), "_blank");
    expect(alert).not.toHaveBeenCalled();
  });

  test('test_openShareUrl_with_invalid_instanceUrl', () => {
    const instanceUrl = 'invalidURL';
    const linkUrl = 'https://sachsen.digital';
    const pageTitle = 'Mediaplayer Test Page';

    bookmarkModal.openShareUrl(instanceUrl, linkUrl, pageTitle);

    expect(window.open).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith("Invalid Server URL");
  });

  test('test_submitInstance_with_valid_form_submission', () => {
    // Mocking the input element and its value
    bookmarkModal.$mastodonInstanceInput = { value: 'mastodon.social' };
    document.title = 'Mediaplayer Page Title';
    bookmarkModal.lastRenderedUrl = 'https://sachsen.digital';

    // Mocking the openShareUrl function to spy on its call
    bookmarkModal.openShareUrl = jest.fn();

    const mockEvent = { preventDefault: jest.fn() };
    bookmarkModal.submitInstance(mockEvent);

    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(bookmarkModal.openShareUrl).toHaveBeenCalledWith('https://mastodon.social', 'https://sachsen.digital', 'Mediaplayer Page Title');
  });

  describe('isValidUrl', () => {
    it('should return true for a valid URL', () => {
      const validUrl = 'https://sachsen.digital';
      expect(bookmarkModal.isValidUrl(validUrl)).toBe(true);
    });

    it('should return false for an invalid URL', () => {
      const invalidUrl = '//invalid-url ';
      expect(bookmarkModal.isValidUrl(invalidUrl)).toBe(false);
    });
  });
});
