/**
 * Tests for platform detection utilities
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { getPlatform } from './platform.js'

describe('platform', () => {
  describe('getPlatform', () => {
    let originalPlatform: NodeJS.Platform

    beforeEach(() => {
      originalPlatform = process.platform
    })

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
        configurable: true,
      })
    })

    it('should return "macos" for darwin platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
        configurable: true,
      })
      expect(getPlatform()).toBe('macos')
    })

    it('should return "linux" for linux platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux',
        writable: true,
        configurable: true,
      })
      expect(getPlatform()).toBe('linux')
    })

    it('should return "windows" for win32 platform', () => {
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
        configurable: true,
      })
      expect(getPlatform()).toBe('windows')
    })

    it('should return "unknown" for unsupported platforms', () => {
      Object.defineProperty(process, 'platform', {
        value: 'freebsd',
        writable: true,
        configurable: true,
      })
      expect(getPlatform()).toBe('unknown')
    })
  })
})
