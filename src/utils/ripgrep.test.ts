/**
 * Tests for ripgrep utilities
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { hasRipgrepSync, ripGrep } from './ripgrep.js'
import { mkdtemp, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import * as path from 'path'

describe('ripgrep', () => {
  describe('hasRipgrepSync', () => {
    it('should return a boolean', () => {
      const result = hasRipgrepSync()
      expect(typeof result).toBe('boolean')
    })

    it('should cache the result on subsequent calls', () => {
      const firstResult = hasRipgrepSync()
      const secondResult = hasRipgrepSync()
      expect(firstResult).toBe(secondResult)
    })
  })

  describe('ripGrep', () => {
    let tempDir: string

    beforeEach(async () => {
      // Skip tests if ripgrep is not available
      if (!hasRipgrepSync()) {
        console.log('Skipping ripGrep tests: ripgrep not installed')
      }
    })

    it('should find matching files', async () => {
      if (!hasRipgrepSync()) return

      tempDir = await mkdtemp(path.join(tmpdir(), 'rg-test-'))
      const testFile = path.join(tempDir, 'test.txt')
      await writeFile(testFile, 'hello world\ntest line\nhello again')

      const abortController = new AbortController()
      const results = await ripGrep(['hello'], tempDir, abortController.signal)

      expect(results.length).toBeGreaterThan(0)
      expect(results.some(line => line.includes('hello'))).toBe(true)

      await rm(tempDir, { recursive: true, force: true })
    })

    it('should return empty array when no matches found', async () => {
      if (!hasRipgrepSync()) return

      tempDir = await mkdtemp(path.join(tmpdir(), 'rg-test-'))
      const testFile = path.join(tempDir, 'test.txt')
      await writeFile(testFile, 'foo bar baz')

      const abortController = new AbortController()
      const results = await ripGrep(['nomatch12345'], tempDir, abortController.signal)

      expect(results).toEqual([])

      await rm(tempDir, { recursive: true, force: true })
    })

    it('should handle --files flag to list files', async () => {
      if (!hasRipgrepSync()) return

      tempDir = await mkdtemp(path.join(tmpdir(), 'rg-test-'))
      await writeFile(path.join(tempDir, 'file1.txt'), 'content')
      await writeFile(path.join(tempDir, 'file2.txt'), 'content')

      const abortController = new AbortController()
      const results = await ripGrep(['--files'], tempDir, abortController.signal)

      expect(results.length).toBeGreaterThanOrEqual(2)
      expect(results.some(f => f.includes('file1.txt'))).toBe(true)
      expect(results.some(f => f.includes('file2.txt'))).toBe(true)

      await rm(tempDir, { recursive: true, force: true })
    })

    it('should handle glob patterns', async () => {
      if (!hasRipgrepSync()) return

      tempDir = await mkdtemp(path.join(tmpdir(), 'rg-test-'))
      await writeFile(path.join(tempDir, 'test.txt'), 'content')
      await writeFile(path.join(tempDir, 'test.js'), 'content')

      const abortController = new AbortController()
      const results = await ripGrep(
        ['--files', '-g', '*.txt'],
        tempDir,
        abortController.signal,
      )

      expect(results.some(f => f.includes('.txt'))).toBe(true)
      expect(results.every(f => !f.includes('.js'))).toBe(true)

      await rm(tempDir, { recursive: true, force: true })
    })

    it('should respect abort signal', async () => {
      if (!hasRipgrepSync()) return

      tempDir = await mkdtemp(path.join(tmpdir(), 'rg-test-'))
      const testFile = path.join(tempDir, 'test.txt')
      await writeFile(testFile, 'test content')

      const abortController = new AbortController()
      abortController.abort()

      await expect(
        ripGrep(['test'], tempDir, abortController.signal),
      ).rejects.toThrow()

      await rm(tempDir, { recursive: true, force: true })
    })

    it('should handle hidden files with --hidden flag', async () => {
      if (!hasRipgrepSync()) return

      tempDir = await mkdtemp(path.join(tmpdir(), 'rg-test-'))
      await writeFile(path.join(tempDir, '.hidden'), 'content')

      const abortController = new AbortController()
      const results = await ripGrep(
        ['--files', '--hidden'],
        tempDir,
        abortController.signal,
      )

      expect(results.some(f => f.includes('.hidden'))).toBe(true)

      await rm(tempDir, { recursive: true, force: true })
    })
  })
})
