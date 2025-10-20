/**
 * Critical tests for macOS sandbox profile generation
 * Tests glob pattern to regex conversion for security enforcement
 */

import { describe, it, expect } from '@jest/globals'
import { globToRegex } from './macos-sandbox-utils.js'

describe('macos-sandbox-utils', () => {
  describe('globToRegex - Security-Critical Pattern Conversion', () => {
    describe('Wildcard Patterns', () => {
      it('should convert single asterisk to match non-slash characters', () => {
        const regex = new RegExp(globToRegex('*.ts'))

        // Should match files in current directory
        expect(regex.test('file.ts')).toBe(true)
        expect(regex.test('test.ts')).toBe(true)

        // Should NOT match files in subdirectories (asterisk doesn't match /)
        expect(regex.test('dir/file.ts')).toBe(false)
        expect(regex.test('a/b/file.ts')).toBe(false)
      })

      it('should convert double asterisk to match everything including slashes', () => {
        const regex = new RegExp(globToRegex('src/**/*.ts'))

        // Should match files at any depth
        expect(regex.test('src/file.ts')).toBe(true)
        expect(regex.test('src/sub/file.ts')).toBe(true)
        expect(regex.test('src/a/b/c/file.ts')).toBe(true)

        // Should NOT match outside src directory
        expect(regex.test('other/file.ts')).toBe(false)
        expect(regex.test('file.ts')).toBe(false)
      })

      it('should handle directory glob star with slash', () => {
        const regex = new RegExp(globToRegex('**/node_modules'))

        // Should match node_modules at any depth
        expect(regex.test('node_modules')).toBe(true)
        expect(regex.test('project/node_modules')).toBe(true)
        expect(regex.test('a/b/c/node_modules')).toBe(true)
      })

      it('should handle question mark for single character', () => {
        const regex = new RegExp(globToRegex('file?.ts'))

        // Should match single character
        expect(regex.test('file1.ts')).toBe(true)
        expect(regex.test('fileA.ts')).toBe(true)
        expect(regex.test('file_.ts')).toBe(true)

        // Should NOT match multiple characters
        expect(regex.test('file12.ts')).toBe(false)
        expect(regex.test('file.ts')).toBe(false)

        // Should NOT match slashes
        expect(regex.test('file/.ts')).toBe(false)
      })
    })

    describe('Literal Path Matching', () => {
      it('should escape regex special characters', () => {
        const testCases: Array<[string, string, boolean]> = [
          ['file.ts', 'file.ts', true],
          ['file.ts', 'filets', false], // Dot should be literal
          ['file(1).ts', 'file(1).ts', true],
          ['file(1).ts', 'file1.ts', false], // Parens should be literal
          ['file+1.ts', 'file+1.ts', true],
          ['file+1.ts', 'file1.ts', false], // Plus should be literal
        ]

        for (const [pattern, testPath, shouldMatch] of testCases) {
          const regex = new RegExp(globToRegex(pattern))
          expect(regex.test(testPath)).toBe(shouldMatch)
        }
      })

      it('should escape dollar signs and carets', () => {
        const regex1 = new RegExp(globToRegex('$file.ts'))
        expect(regex1.test('$file.ts')).toBe(true)

        const regex2 = new RegExp(globToRegex('^file.ts'))
        expect(regex2.test('^file.ts')).toBe(true)
      })

      it('should escape backslashes', () => {
        const regex = new RegExp(globToRegex('path\\to\\file'))
        expect(regex.test('path\\to\\file')).toBe(true)
      })
    })

    describe('Absolute Paths', () => {
      it('should handle absolute Unix paths', () => {
        const regex = new RegExp(globToRegex('/usr/local/bin/*'))

        expect(regex.test('/usr/local/bin/node')).toBe(true)
        expect(regex.test('/usr/local/bin/npm')).toBe(true)
        // Pattern matches anything after the last slash except another slash
        expect(regex.test('/usr/bin/node')).toBe(false)
      })

      it('should handle home directory patterns', () => {
        const regex = new RegExp(globToRegex('/Users/*/Library'))

        expect(regex.test('/Users/alice/Library')).toBe(true)
        expect(regex.test('/Users/bob/Library')).toBe(true)
        expect(regex.test('/Users/alice/bob/Library')).toBe(false)
      })
    })

    describe('Complex Patterns', () => {
      it('should handle multiple wildcards in one pattern', () => {
        const regex = new RegExp(globToRegex('src/**/test/*.spec.ts'))

        expect(regex.test('src/test/example.spec.ts')).toBe(true)
        expect(regex.test('src/foo/test/example.spec.ts')).toBe(true)
        expect(regex.test('src/foo/bar/test/example.spec.ts')).toBe(true)
        expect(regex.test('src/foo/bar/test/nested/example.spec.ts')).toBe(
          false,
        )
      })

      it('should handle mixed glob patterns', () => {
        const regex = new RegExp(globToRegex('**/src/*.?s'))

        expect(regex.test('project/src/file.ts')).toBe(true)
        expect(regex.test('project/src/file.js')).toBe(true)
        expect(regex.test('src/file.ts')).toBe(true)
        expect(regex.test('project/src/file.tsx')).toBe(false) // Two characters
      })

      it('should handle patterns with dots and wildcards', () => {
        const regex = new RegExp(globToRegex('.config/**/*'))

        expect(regex.test('.config/app.json')).toBe(true)
        expect(regex.test('.config/sub/app.json')).toBe(true)
        expect(regex.test('.config/deep/nested/app.json')).toBe(true)
      })
    })

    describe('Security-Critical Edge Cases', () => {
      it('should properly anchor patterns with ^ and $', () => {
        const regex = globToRegex('/etc/passwd')

        // Should be anchored
        expect(regex.startsWith('^')).toBe(true)
        expect(regex.endsWith('$')).toBe(true)

        // Should match exact path only
        const re = new RegExp(regex)
        expect(re.test('/etc/passwd')).toBe(true)
        expect(re.test('x/etc/passwd')).toBe(false)
        expect(re.test('/etc/passwd/x')).toBe(false)
      })

      it('should not allow wildcard to match parent directory traversal', () => {
        const regex = new RegExp(globToRegex('/allowed/*'))

        // Should match direct children
        expect(regex.test('/allowed/file.txt')).toBe(true)

        // Should NOT match if path contains slashes (preventing traversal)
        expect(regex.test('/allowed/../etc/passwd')).toBe(false)
      })

      it('should handle empty pattern', () => {
        const regex = globToRegex('')
        expect(regex).toBe('^$')

        const re = new RegExp(regex)
        expect(re.test('')).toBe(true)
        expect(re.test('anything')).toBe(false)
      })

      it('should handle pattern with only wildcards', () => {
        const regexStar = new RegExp(globToRegex('*'))
        expect(regexStar.test('file')).toBe(true)
        expect(regexStar.test('dir/file')).toBe(false)

        const regexDoubleStar = new RegExp(globToRegex('**'))
        expect(regexDoubleStar.test('file')).toBe(true)
        expect(regexDoubleStar.test('dir/file')).toBe(true)
        expect(regexDoubleStar.test('a/b/c/file')).toBe(true)
      })
    })

    describe('Bracket Expressions', () => {
      it('should preserve character classes', () => {
        const regex = new RegExp(globToRegex('file[0-9].txt'))

        expect(regex.test('file0.txt')).toBe(true)
        expect(regex.test('file5.txt')).toBe(true)
        expect(regex.test('file9.txt')).toBe(true)
        expect(regex.test('filea.txt')).toBe(false)
        expect(regex.test('file10.txt')).toBe(false)
      })

      it('should handle character sets', () => {
        const regex = new RegExp(globToRegex('file[abc].txt'))

        expect(regex.test('filea.txt')).toBe(true)
        expect(regex.test('fileb.txt')).toBe(true)
        expect(regex.test('filec.txt')).toBe(true)
        expect(regex.test('filed.txt')).toBe(false)
      })

      it('should escape unclosed brackets', () => {
        const regex = globToRegex('file[abc')
        // Should escape the unclosed bracket
        expect(regex).toContain('\\[')
      })
    })

    describe('Real-World Sandbox Patterns', () => {
      it('should match common deny patterns for system files', () => {
        const patterns = [
          { pattern: '/etc/**', path: '/etc/passwd', shouldMatch: true },
          {
            pattern: '/etc/**',
            path: '/etc/ssl/certs/ca.pem',
            shouldMatch: true,
          },
          {
            pattern: '~/.ssh/**',
            path: '/Users/test/.ssh/id_rsa',
            shouldMatch: false,
          }, // Would need expansion
          {
            pattern: '**/.git/config',
            path: 'project/.git/config',
            shouldMatch: true,
          },
          {
            pattern: '**/.git/config',
            path: 'a/b/.git/config',
            shouldMatch: true,
          },
        ]

        for (const { pattern, path, shouldMatch } of patterns) {
          const regex = new RegExp(globToRegex(pattern))
          expect(regex.test(path)).toBe(shouldMatch)
        }
      })

      it('should match patterns for dangerous files', () => {
        const dangerousFilePattern = '**/.bashrc'
        const regex = new RegExp(globToRegex(dangerousFilePattern))

        expect(regex.test('.bashrc')).toBe(true)
        expect(regex.test('home/user/.bashrc')).toBe(true)
        expect(regex.test('a/b/c/.bashrc')).toBe(true)
        expect(regex.test('bashrc')).toBe(false)
      })

      it('should correctly restrict git hooks', () => {
        const hookPattern = '**/.git/hooks/**'
        const regex = new RegExp(globToRegex(hookPattern))

        expect(regex.test('.git/hooks/pre-commit')).toBe(true)
        expect(regex.test('project/.git/hooks/pre-commit')).toBe(true)
        expect(regex.test('a/b/project/.git/hooks/post-receive')).toBe(true)
        expect(regex.test('.git/config')).toBe(false)
      })
    })
  })
})
