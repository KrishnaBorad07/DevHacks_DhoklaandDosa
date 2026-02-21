import type { TextStyleWhiteSpace } from '../../TextStyle';
/**
 * Cache of new line character codes.
 * @internal
 */
export declare const NEWLINES: number[];
/**
 * Set of new line character codes for fast lookup.
 * @internal
 */
export declare const NEWLINES_SET: Set<number>;
/**
 * Cache of breaking space character codes.
 * @internal
 */
export declare const BREAKING_SPACES: number[];
/**
 * Set of breaking space character codes for fast lookup.
 * @internal
 */
export declare const BREAKING_SPACES_SET: Set<number>;
/**
 * Regex to split text while capturing newline sequences.
 * @internal
 */
export declare const NEWLINE_SPLIT_REGEX: RegExp;
/**
 * Regex to split text on newlines without capturing.
 * @internal
 */
export declare const NEWLINE_MATCH_REGEX: RegExp;
/**
 * Determines if char is a newline.
 * @param char - The character
 * @returns True if newline, False otherwise.
 * @internal
 */
export declare function isNewline(char: string): boolean;
/**
 * Determines if char is a breaking whitespace.
 *
 * It allows one to determine whether char should be a breaking whitespace
 * For example certain characters in CJK langs or numbers.
 * It must return a boolean.
 * @param char - The character
 * @param _nextChar - The next character (unused, for override compatibility)
 * @returns True if whitespace, False otherwise.
 * @internal
 */
export declare function isBreakingSpace(char: string, _nextChar?: string): boolean;
/**
 * Determines whether we should collapse breaking spaces.
 * @param whiteSpace - The TextStyle property whiteSpace
 * @returns Should collapse
 * @internal
 */
export declare function collapseSpaces(whiteSpace: TextStyleWhiteSpace): boolean;
/**
 * Determines whether we should collapse newLine chars.
 * @param whiteSpace - The white space
 * @returns should collapse
 * @internal
 */
export declare function collapseNewlines(whiteSpace: TextStyleWhiteSpace): boolean;
/**
 * Trims breaking whitespaces from the right side of a string.
 * @param text - The text
 * @returns Trimmed string
 * @internal
 */
export declare function trimRight(text: string): string;
/**
 * Splits a string into words, breaking-spaces and newLine characters
 * @param text - The text
 * @returns A tokenized array
 * @internal
 */
export declare function tokenize(text: string): string[];
/**
 * Splits a token into character groups that should not be broken apart.
 * Adjacent characters that can't be broken are combined into single groups.
 * @param token - The token to split
 * @param breakWords - Whether word breaking is enabled
 * @param splitFn - Function to split token into characters (default: grapheme segmenter)
 * @param canBreakCharsFn - Function to check if chars can be broken
 * @returns Array of character groups
 * @internal
 */
export declare function getCharacterGroups(token: string, breakWords: boolean, splitFn: (s: string) => string[], canBreakCharsFn: (char: string, nextChar: string, token: string, index: number, breakWords: boolean) => boolean): string[];
