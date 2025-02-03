// @ts-check

import ShakaThumbnailTrack from 'DlfMediaPlayer/lib/thumbnails/ShakaThumbnailTrack';

/**
 * @typedef {string} GroupKey
 *
 * @typedef {{
 *  key: GroupKey;
 *  variants: shaka.extern.Variant[];
 *  roles: Set<string>;
 *  hasPrimary: boolean;
 * }} Group
 *
 * @typedef {{
 *  id: string | null;
 *  group: string;
 * }} GroupId
 */

/**
 * This class is used to allow switching between independent video tracks.
 *
 * By default, Shaka Player considers all variants that match the selected role
 * and language to be playable. (For information on what a variant is, see
 * https://shaka-player-demo.appspot.com/docs/api/shaka.extern.html#.Variant.)
 *
 * To add video tracks (more generally, "groups") as a third category, here we
 * store all available variants, and allow selecting a group by limiting the
 * variants seen by Shaka to those in the selected group.
 *
 * The variants are grouped via their representation id (MPD) or name (HLS).
 */
export default class VariantGroups {
  /**
   *
   * @param {shaka.Player} player Player to which the variant groups are bound.
   * Variants are read from this player's manifest.
   */
  constructor(player) {
    /**
     * @private
     * @type {shaka.Player}
     */
    this.player = player;

    /**
     * @private
     * @type {shaka.extern.Manifest | null}
     */
    this.manifest = player.getManifest();

    /**
     * @private
     * @type {GroupKey[]}
     */
    this.groupKeys = [];

    /**
     * @private
     * @type {Group[]}
     */
    this.groups = [];

    /**
     * @private
     * @type {Record<GroupKey, Group>}
     */
    this.keyToGroup = {};

    if (this.manifest === null) {
      console.warn("Manifest not available");
      return;
    }

    for (const variant of this.manifest.variants) {
      this.addVariant(variant);
    }
  }

  /**
   * Parses the representation ID / name {@link id}.
   *
   * @param {string | null} id
   * @returns {GroupId}
   */
  static splitRepresentationId(id) {
    const parts = (id ?? "").split('#');

    return {
      id: parts[0] ?? null,
      group: parts[1] ?? "Standard",
    };
  }

  /**
   * Sorts {@link variant} into its group if it references a video.
   *
   * @param {shaka.extern.Variant} variant
   */
  addVariant(variant) {
    const video = variant.video;

    if (video) {
      const key = VariantGroups.splitRepresentationId(video.originalId).group;
      const group = this.getGroupOrCreate(key);

      group.variants.push(variant);

      for (const role of video.roles) {
        group.roles.add(role);
      }

      if (video.primary) {
        group.hasPrimary = true;
      }
    }
  }

  /**
   * The number of variant groups.
   *
   * @returns {number}
   */
  get numGroups() {
    return this.groupKeys.length;
  }

  /**
   * Returns a group with the specified key. If the group does not yet exist,
   * an empty group with this key is created.
   *
   * @param {GroupKey} key
   * @returns {Group}
   */
  getGroupOrCreate(key) {
    let group = this.keyToGroup[key];

    if (!group) {
      group = this.keyToGroup[key] = {
        key: key,
        variants: [],
        roles: new Set(),
        hasPrimary: false,
      };

      this.groupKeys.push(key);
      this.groups.push(group);
    }

    return group;
  }

  /**
   * Returns the track that is currently active (in the bound player), or
   * `undefined` if no track is active.
   *
   * @returns {shaka.extern.Track | undefined}
   */
  findActiveTrack() {
    // There should be at most one active variant at a time
    return this.player.getVariantTracks().find(track => track.active);
  }

  /**
   * Returns the thumbnail tracks that match the currently active group.
   *
   * This abstracts over the ways how thumbnails may be provided, namely either
   * via the video manifest, or via a separate thumbnails.json manifest.
   *
   * @returns {dlf.media.ThumbnailTrack[]}
   */
  findThumbnailTracks() {
    /** @type {dlf.media.ThumbnailTrack[]} */
    const result = [];

    const activeGroupKey = this.findActiveGroup()?.key;

    // Add thumbnails from DASH / HLS
    for (const track of this.player.getImageTracks()) {
      if (VariantGroups.splitRepresentationId(track.originalImageId).group === activeGroupKey) {
        result.push(new ShakaThumbnailTrack(this.player, track));
      }
    }

    return result;
  }

  /**
   * Returns the group of the currently active track, or `undefined` if there is
   * no such group.
   *
   * @returns {Group | undefined}
   */
  findActiveGroup() {
    const track = this.findActiveTrack();

    if (track) {
      const key =
        VariantGroups.splitRepresentationId(track.originalVideoId).group;

      return this.keyToGroup[key];
    }
  }

  /**
   * Selects a track within {@link group}. Tracks that have the same audio
   * language as the currently active track are preferred.
   *
   * @param {Group} group
   */
  selectGroup(group) {
    if (!this.manifest) {
      console.warn("Cannot select group: Manifest not available");
      return;
    }

    // NOTE: The object-based comparison is intentional and suffices to prevent
    //       re-selecting the currently active group.
    if (this.manifest.variants !== group.variants) {
      // Get active track before selecting group variants
      const activeTrack = this.findActiveTrack();

      this.manifest.variants = group.variants;

      // Basically, trigger Shaka to select a variant
      // TODO: Also consider role?
      this.player.selectAudioLanguage(activeTrack?.language ?? 'und');
    }
  }

  /**
   *
   * @protected
   * @param {Group | undefined} group
   * @returns {boolean}
   */
  trySelectGroup(group) {
    if (group) {
      this.selectGroup(group);
      return true;
    } else {
      return false;
    }
  }

  /**
   * Selects the group specified by {@link key} (cf. {@link selectGroup}).
   *
   * @param {GroupKey} key
   * @returns {boolean} Whether or not a relevant group has been found.
   */
  selectGroupByKey(key) {
    return this.trySelectGroup(this.keyToGroup[key]);
  }

  /**
   * Selects the group of index {@link index} (cf. {@link selectGroup}).
   *
   * @param {number} idx
   * @returns {boolean} Whether or not a relevant group has been found.
   */
  selectGroupByIndex(idx) {
    return this.trySelectGroup(this.groups[idx]);
  }

  /**
   * Selects a group of the specified {@link role} (cf. {@link selectGroup}).
   *
   * @param {string} role
   * @returns {boolean} Whether or not a relevant group has been found.
   */
  selectGroupByRole(role) {
    return this.trySelectGroup(this.groups.find(g => g.roles.has(role)));
  }

  /**
   * Selects a group that has a stream marked as primary via role "main" or
   * HLS DEFAULT attribute (cf. {@link selectGroup}).
   *
   * @returns {boolean} Whether or not a relevant group has been found.
   */
  selectGroupWithPrimary() {
    return this.trySelectGroup(this.groups.find(g => g.hasPrimary));
  }

  /**
   * Iterates through the groups.
   *
   * @returns {IterableIterator<Group>}
   */
  *[Symbol.iterator]() {
    for (const key in this.keyToGroup) {
      yield /** @type {Group} */(this.keyToGroup[key]);
    }
  }
}
