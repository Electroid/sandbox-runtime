/**
 * Tests for macOS sandbox utilities
 */

import { describe, it, expect } from '@jest/globals'
import { globToRegex } from './macos-sandbox-utils.js'

describe('macos-sandbox-utils', () => {
  describe('globToRegex', () => {
    it('should convert simple wildcard patterns', () => {
      const regex = globToRegex('*.ts')
      expect(regex).toBe('^[^/]*\\.ts$')
      expect(new RegExp(regex).test('file.ts')).toBe(true)
      expect(new RegExp(regex).test('dir/file.ts')).toBe(false)
    })

    it('should convert directory glob patterns', () => {
      const regex = globToRegex('src/**/*.ts')
      expect(new RegExp(regex).test('src/file.ts')).toBe(true)
      expect(new RegExp(regex).test('src/sub/file.ts')).toBe(true)
      expect(new RegExp(regex).test('src/deep/nested/file.ts')).toBe(true)
      expect(new RegExp(regex).test('other/file.ts')).toBe(false)
    })

    it('should handle single wildcard not matching slashes', () => {
      const regex = globToRegex('src/*.ts')
      expect(new RegExp(regex).test('src/file.ts')).toBe(true)
      expect(new RegExp(regex).test('src/sub/file.ts')).toBe(false)
    })

    it('should handle question mark for single character', () => {
      const regex = globToRegex('file?.ts')
      expect(new RegExp(regex).test('file1.ts')).toBe(true)
      expect(new RegExp(regex).test('fileA.ts')).toBe(true)
      expect(new RegExp(regex).test('file12.ts')).toBe(false)
      expect(new RegExp(regex).test('file.ts')).toBe(false)
    })

    it('should handle question mark not matching slashes', () => {
      const regex = globToRegex('src/?/file.ts')
      expect(new RegExp(regex).test('src/a/file.ts')).toBe(true)
      expect(new RegExp(regex).test('src/x/file.ts')).toBe(true)
      expect(new RegExp(regex).test('src/ab/file.ts')).toBe(false)
    })

    it('should handle double globstar', () => {
      const regex = globToRegex('**/file.ts')
      expect(new RegExp(regex).test('file.ts')).toBe(true)
      expect(new RegExp(regex).test('dir/file.ts')).toBe(true)
      expect(new RegExp(regex).test('deep/nested/dir/file.ts')).toBe(true)
    })

    it('should handle globstar with slash', () => {
      const regex = globToRegex('src/**/test')
      expect(new RegExp(regex).test('src/test')).toBe(true)
      expect(new RegExp(regex).test('src/sub/test')).toBe(true)
      expect(new RegExp(regex).test('src/deep/nested/test')).toBe(true)
    })

    it('should escape regex special characters', () => {
      const regex = globToRegex('file.ts')
      expect(new RegExp(regex).test('file.ts')).toBe(true)
      expect(new RegExp(regex).test('filets')).toBe(false) // . is escaped, not wildcard
    })

    it('should escape parentheses', () => {
      const regex = globToRegex('file(1).ts')
      expect(new RegExp(regex).test('file(1).ts')).toBe(true)
      expect(new RegExp(regex).test('file1.ts')).toBe(false)
    })

    it('should escape plus signs', () => {
      const regex = globToRegex('file+1.ts')
      expect(new RegExp(regex).test('file+1.ts')).toBe(true)
      expect(new RegExp(regex).test('file1.ts')).toBe(false)
    })

    it('should handle complex patterns', () => {
      const regex = globToRegex('src/**/*.{ts,js}')
      // Note: This doesn't expand {ts,js} - that would require more complex handling
      expect(regex).toContain('src')
    })

    it('should anchor patterns with ^ and $', () => {
      const regex = globToRegex('file.ts')
      expect(regex.startsWith('^')).toBe(true)
      expect(regex.endsWith('$')).toBe(true)
    })

    it('should handle absolute paths', () => {
      const regex = globToRegex('/usr/local/bin/*')
      expect(new RegExp(regex).test('/usr/local/bin/node')).toBe(true)
      expect(new RegExp(regex).test('/usr/local/bin/npm')).toBe(true)
      expect(new RegExp(regex).test('/usr/bin/node')).toBe(false)
    })

    it('should handle multiple wildcards', () => {
      const regex = globToRegex('*.*.ts')
      expect(new RegExp(regex).test('file.spec.ts')).toBe(true)
      expect(new RegExp(regex).test('file.test.ts')).toBe(true)
      expect(new RegExp(regex).test('file.ts')).toBe(false)
    })

    it('should handle empty string', () => {
      const regex = globToRegex('')
      expect(regex).toBe('^$')
      expect(new RegExp(regex).test('')).toBe(true)
      expect(new RegExp(regex).test('anything')).toBe(false)
    })

    it('should handle paths with dots', () => {
      const regex = globToRegex('.config/**/*')
      expect(new RegExp(regex).test('.config/file.txt')).toBe(true)
      expect(new RegExp(regex).test('.config/sub/file.txt')).toBe(true)
    })

    it('should handle trailing slash in globstar', () => {
      const regex = globToRegex('src/**/')
      expect(new RegExp(regex).test('src/')).toBe(true)
      expect(new RegExp(regex).test('src/sub/')).toBe(true)
    })

    it('should escape backslashes', () => {
      const regex = globToRegex('path\\to\\file')
      expect(regex).toContain('\\\\')
    })

    it('should handle bracket expressions (character classes)', () => {
      const regex = globToRegex('file[0-9].ts')
      // The regex should preserve the bracket expression
      expect(regex).toContain('[0-9]')
    })

    it('should handle unclosed brackets', () => {
      const regex = globToRegex('file[abc')
      // Should escape unclosed bracket
      expect(regex).toContain('\\[')
    })
  })
})
