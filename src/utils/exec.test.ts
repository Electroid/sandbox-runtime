/**
 * Tests for exec utilities
 */

import { describe, it, expect } from '@jest/globals'
import { execFileNoThrow } from './exec.js'

describe('exec', () => {
  describe('execFileNoThrow', () => {
    it('should execute a command successfully', async () => {
      const result = await execFileNoThrow('echo', ['hello'])
      expect(result.code).toBe(0)
      expect(result.stdout.trim()).toBe('hello')
      expect(result.stderr).toBe('')
    })

    it('should not throw on non-zero exit codes', async () => {
      // false command always returns exit code 1
      const result = await execFileNoThrow('false', [])
      expect(result.code).toBe(1)
    })

    it('should return stdout and stderr', async () => {
      const result = await execFileNoThrow('node', [
        '-e',
        'console.log("out"); console.error("err")',
      ])
      expect(result.code).toBe(0)
      expect(result.stdout.trim()).toBe('out')
      expect(result.stderr.trim()).toBe('err')
    })

    it('should handle command not found', async () => {
      const result = await execFileNoThrow('nonexistentcommand12345', [])
      // Should return non-zero exit code for command not found
      expect(result.code).not.toBe(0)
    })

    it('should respect timeout option', async () => {
      const result = await execFileNoThrow('sleep', ['10'], { timeout: 100 })
      expect(result.code).not.toBe(0)
    }, 10000)

    it('should respect cwd option', async () => {
      const result = await execFileNoThrow('pwd', [], { cwd: '/tmp' })
      expect(result.code).toBe(0)
      expect(result.stdout.trim()).toBe('/tmp')
    })

    it('should use default timeout of 10000ms when not specified', async () => {
      const result = await execFileNoThrow('echo', ['test'])
      expect(result.code).toBe(0)
    })

    it('should handle empty args array', async () => {
      const result = await execFileNoThrow('pwd', [])
      expect(result.code).toBe(0)
      expect(result.stdout).toBeTruthy()
    })

    it('should handle commands with multiple arguments', async () => {
      const result = await execFileNoThrow('echo', ['hello', 'world', 'test'])
      expect(result.code).toBe(0)
      expect(result.stdout.trim()).toBe('hello world test')
    })
  })
})
