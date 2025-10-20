/**
 * Tests for HTTP proxy server
 */

import { describe, it, expect } from '@jest/globals'
import { createHttpProxyServer } from './http-proxy.js'

describe('http-proxy', () => {
  describe('createHttpProxyServer', () => {
    it('should create an HTTP proxy server', () => {
      const filter = jest.fn(() => true)
      const server = createHttpProxyServer({ filter })

      expect(server).toBeDefined()
      expect(typeof server.listen).toBe('function')
      expect(typeof server.close).toBe('function')

      server.close()
    })

    it('should create server with async filter function', () => {
      const filter = jest.fn(async () => true)
      const server = createHttpProxyServer({ filter })

      expect(server).toBeDefined()
      server.close()
    })

    it('should create server with rejecting filter function', () => {
      const filter = jest.fn(() => false)
      const server = createHttpProxyServer({ filter })

      expect(server).toBeDefined()
      server.close()
    })

    it('should create server and allow closing without listening', () => {
      const filter = jest.fn(() => true)
      const server = createHttpProxyServer({ filter })

      // Closing a server that's not listening is a no-op and doesn't error
      // Just verify the server object exists
      expect(server).toBeDefined()
      server.close()
    })
  })
})
