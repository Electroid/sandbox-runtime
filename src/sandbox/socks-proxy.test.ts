/**
 * Tests for SOCKS proxy server
 */

import { describe, it, expect } from '@jest/globals'
import { createSocksProxyServer } from './socks-proxy.js'

describe('socks-proxy', () => {
  describe('createSocksProxyServer', () => {
    it('should create a SOCKS proxy server wrapper', () => {
      const filter = jest.fn(() => true)
      const wrapper = createSocksProxyServer({ filter })

      expect(wrapper).toBeDefined()
      expect(wrapper.server).toBeDefined()
      expect(typeof wrapper.listen).toBe('function')
      expect(typeof wrapper.close).toBe('function')
      expect(typeof wrapper.getPort).toBe('function')
      expect(typeof wrapper.unref).toBe('function')
    })

    it('should return undefined port when not listening', () => {
      const filter = jest.fn(() => true)
      const wrapper = createSocksProxyServer({ filter })

      expect(wrapper.getPort()).toBeUndefined()
    })

    it('should create server with async filter function', () => {
      const filter = jest.fn(async () => true)
      const wrapper = createSocksProxyServer({ filter })

      expect(wrapper).toBeDefined()
    })

    it('should create server with rejecting filter function', () => {
      const filter = jest.fn(() => false)
      const wrapper = createSocksProxyServer({ filter })

      expect(wrapper).toBeDefined()
    })

    it('should handle close without listening', async () => {
      const filter = jest.fn(() => true)
      const wrapper = createSocksProxyServer({ filter })

      await expect(wrapper.close()).resolves.toBeUndefined()
    })

    it('should handle unref without listening', () => {
      const filter = jest.fn(() => true)
      const wrapper = createSocksProxyServer({ filter })

      expect(() => wrapper.unref()).not.toThrow()
    })
  })
})
