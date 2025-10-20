/**
 * Tests for sandbox utility functions
 */

import { describe, it, expect, jest } from '@jest/globals'
import * as path from 'path'
import {
  containsGlobChars,
  removeTrailingGlobSuffix,
  normalizePathForSandbox,
  getDefaultWritePaths,
  generateProxyEnvVars,
  encodeSandboxedCommand,
  decodeSandboxedCommand,
} from './sandbox-utils.js'

describe('sandbox-utils', () => {
  describe('containsGlobChars', () => {
    it('should return true for patterns with asterisks', () => {
      expect(containsGlobChars('*.ts')).toBe(true)
      expect(containsGlobChars('/path/*/file')).toBe(true)
      expect(containsGlobChars('/path/**')).toBe(true)
    })

    it('should return true for patterns with question marks', () => {
      expect(containsGlobChars('file?.ts')).toBe(true)
      expect(containsGlobChars('/path/file?')).toBe(true)
    })

    it('should return true for patterns with brackets', () => {
      expect(containsGlobChars('[abc]')).toBe(true)
      expect(containsGlobChars('/path/file[123]')).toBe(true)
      expect(containsGlobChars('file[a-z]')).toBe(true)
    })

    it('should return false for regular paths without glob chars', () => {
      expect(containsGlobChars('/path/to/file')).toBe(false)
      expect(containsGlobChars('simple.txt')).toBe(false)
      expect(containsGlobChars('/usr/bin/node')).toBe(false)
    })

    it('should handle empty strings', () => {
      expect(containsGlobChars('')).toBe(false)
    })
  })

  describe('removeTrailingGlobSuffix', () => {
    it('should remove /** suffix', () => {
      expect(removeTrailingGlobSuffix('/path/to/dir/**')).toBe('/path/to/dir')
      expect(removeTrailingGlobSuffix('/usr/**')).toBe('/usr')
    })

    it('should not remove /** from middle of path', () => {
      expect(removeTrailingGlobSuffix('/path/**/file')).toBe('/path/**/file')
    })

    it('should not change paths without /** suffix', () => {
      expect(removeTrailingGlobSuffix('/path/to/dir')).toBe('/path/to/dir')
      expect(removeTrailingGlobSuffix('/path/*')).toBe('/path/*')
    })

    it('should handle empty strings', () => {
      expect(removeTrailingGlobSuffix('')).toBe('')
    })

    it('should handle multiple /** patterns', () => {
      expect(removeTrailingGlobSuffix('/path/**/**')).toBe('/path/**')
    })
  })

  describe('normalizePathForSandbox', () => {
    it('should expand tilde to home directory', () => {
      const result = normalizePathForSandbox('~')
      expect(result).not.toContain('~')
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should expand ~/path to home directory path', () => {
      const result = normalizePathForSandbox('~/Documents')
      expect(result).not.toContain('~')
      expect(result).toContain('Documents')
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should convert relative paths to absolute', () => {
      const result = normalizePathForSandbox('./file.txt')
      expect(path.isAbsolute(result)).toBe(true)
      expect(result).toContain('file.txt')
    })

    it('should convert parent relative paths to absolute', () => {
      const result = normalizePathForSandbox('../file.txt')
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should leave absolute paths unchanged', () => {
      const absolutePath = '/usr/bin/node'
      const result = normalizePathForSandbox(absolutePath)
      expect(result).toContain('/usr/bin')
    })

    it('should preserve glob patterns', () => {
      const result = normalizePathForSandbox('./src/**/*.ts')
      expect(result).toContain('**')
      expect(result).toContain('*.ts')
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should handle glob patterns with tilde', () => {
      const result = normalizePathForSandbox('~/Documents/**/*.txt')
      expect(result).not.toContain('~')
      expect(result).toContain('**')
      expect(result).toContain('*.txt')
    })

    it('should handle single dot as current directory', () => {
      const result = normalizePathForSandbox('.')
      expect(path.isAbsolute(result)).toBe(true)
    })

    it('should handle double dot as parent directory', () => {
      const result = normalizePathForSandbox('..')
      expect(path.isAbsolute(result)).toBe(true)
    })
  })

  describe('getDefaultWritePaths', () => {
    it('should return an array of paths', () => {
      const paths = getDefaultWritePaths()
      expect(Array.isArray(paths)).toBe(true)
      expect(paths.length).toBeGreaterThan(0)
    })

    it('should include standard dev paths', () => {
      const paths = getDefaultWritePaths()
      expect(paths).toContain('/dev/stdout')
      expect(paths).toContain('/dev/stderr')
      expect(paths).toContain('/dev/null')
      expect(paths).toContain('/dev/tty')
    })

    it('should include current directory', () => {
      const paths = getDefaultWritePaths()
      expect(paths).toContain('.')
    })

    it('should include npm logs path with absolute home directory', () => {
      const paths = getDefaultWritePaths()
      const npmLogsPath = paths.find(p => p.includes('.npm/_logs'))
      expect(npmLogsPath).toBeDefined()
      expect(path.isAbsolute(npmLogsPath!)).toBe(true)
    })

    it('should not contain duplicates', () => {
      const paths = getDefaultWritePaths()
      const uniquePaths = Array.from(new Set(paths))
      expect(paths.length).toBe(uniquePaths.length)
    })
  })

  describe('generateProxyEnvVars', () => {
    it('should return only SANDBOX_RUNTIME when no ports provided', () => {
      const envVars = generateProxyEnvVars()
      expect(envVars).toEqual(['SANDBOX_RUNTIME=1'])
    })

    it('should generate HTTP proxy vars when httpProxyPort provided', () => {
      const envVars = generateProxyEnvVars(8080)
      expect(envVars).toContain('HTTP_PROXY=http://localhost:8080')
      expect(envVars).toContain('HTTPS_PROXY=http://localhost:8080')
      expect(envVars).toContain('http_proxy=http://localhost:8080')
      expect(envVars).toContain('https_proxy=http://localhost:8080')
    })

    it('should generate SOCKS proxy vars when socksProxyPort provided', () => {
      const envVars = generateProxyEnvVars(undefined, 1080)
      expect(envVars).toContain('ALL_PROXY=socks5h://localhost:1080')
      expect(envVars).toContain('all_proxy=socks5h://localhost:1080')
    })

    it('should generate NO_PROXY vars when ports provided', () => {
      const envVars = generateProxyEnvVars(8080, 1080)
      const noProxyVar = envVars.find(v => v.startsWith('NO_PROXY='))
      expect(noProxyVar).toBeDefined()
      expect(noProxyVar).toContain('localhost')
      expect(noProxyVar).toContain('127.0.0.1')
      expect(noProxyVar).toContain('::1')
    })

    it('should include both HTTP and SOCKS when both ports provided', () => {
      const envVars = generateProxyEnvVars(8080, 1080)
      expect(envVars.some(v => v.includes('HTTP_PROXY'))).toBe(true)
      expect(envVars.some(v => v.includes('ALL_PROXY'))).toBe(true)
    })

    it('should set FTP proxy when SOCKS proxy provided', () => {
      const envVars = generateProxyEnvVars(undefined, 1080)
      expect(envVars).toContain('FTP_PROXY=socks5h://localhost:1080')
      expect(envVars).toContain('ftp_proxy=socks5h://localhost:1080')
    })

    it('should set RSYNC proxy when SOCKS proxy provided', () => {
      const envVars = generateProxyEnvVars(undefined, 1080)
      expect(envVars).toContain('RSYNC_PROXY=localhost:1080')
    })

    it('should set Docker proxy vars', () => {
      const envVars = generateProxyEnvVars(8080, 1080)
      expect(envVars.some(v => v.includes('DOCKER_HTTP_PROXY'))).toBe(true)
      expect(envVars.some(v => v.includes('DOCKER_HTTPS_PROXY'))).toBe(true)
    })

    it('should set Google Cloud SDK proxy vars when HTTP proxy provided', () => {
      const envVars = generateProxyEnvVars(8080, 1080)
      expect(envVars).toContain('CLOUDSDK_PROXY_TYPE=https')
      expect(envVars).toContain('CLOUDSDK_PROXY_ADDRESS=localhost')
      expect(envVars).toContain('CLOUDSDK_PROXY_PORT=8080')
    })

    it('should set gRPC proxy vars when SOCKS proxy provided', () => {
      const envVars = generateProxyEnvVars(undefined, 1080)
      expect(envVars).toContain('GRPC_PROXY=socks5h://localhost:1080')
      expect(envVars).toContain('grpc_proxy=socks5h://localhost:1080')
    })

    it('should always include SANDBOX_RUNTIME env var', () => {
      expect(generateProxyEnvVars()).toContain('SANDBOX_RUNTIME=1')
      expect(generateProxyEnvVars(8080)).toContain('SANDBOX_RUNTIME=1')
      expect(generateProxyEnvVars(undefined, 1080)).toContain('SANDBOX_RUNTIME=1')
      expect(generateProxyEnvVars(8080, 1080)).toContain('SANDBOX_RUNTIME=1')
    })
  })

  describe('encodeSandboxedCommand', () => {
    it('should encode a command to base64', () => {
      const command = 'ls -la'
      const encoded = encodeSandboxedCommand(command)
      expect(encoded).toBe(Buffer.from(command).toString('base64'))
    })

    it('should truncate long commands to 100 chars', () => {
      const longCommand = 'a'.repeat(200)
      const encoded = encodeSandboxedCommand(longCommand)
      const decoded = Buffer.from(encoded, 'base64').toString('utf8')
      expect(decoded.length).toBe(100)
    })

    it('should handle empty commands', () => {
      const encoded = encodeSandboxedCommand('')
      expect(encoded).toBe('')
    })

    it('should handle special characters', () => {
      const command = 'echo "Hello, World!" && exit 0'
      const encoded = encodeSandboxedCommand(command)
      expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe(command)
    })

    it('should handle Unicode characters', () => {
      const command = 'echo "Hello 世界 🌍"'
      const encoded = encodeSandboxedCommand(command)
      expect(Buffer.from(encoded, 'base64').toString('utf8')).toBe(command)
    })
  })

  describe('decodeSandboxedCommand', () => {
    it('should decode a base64 command', () => {
      const command = 'ls -la'
      const encoded = Buffer.from(command).toString('base64')
      expect(decodeSandboxedCommand(encoded)).toBe(command)
    })

    it('should round-trip encode and decode', () => {
      const command = 'npm install package-name'
      const encoded = encodeSandboxedCommand(command)
      const decoded = decodeSandboxedCommand(encoded)
      expect(decoded).toBe(command)
    })

    it('should handle empty strings', () => {
      expect(decodeSandboxedCommand('')).toBe('')
    })

    it('should handle special characters', () => {
      const command = 'echo "Test & test | test > test"'
      const encoded = Buffer.from(command).toString('base64')
      expect(decodeSandboxedCommand(encoded)).toBe(command)
    })

    it('should handle Unicode characters', () => {
      const command = 'echo "Test 日本語 🎌"'
      const encoded = Buffer.from(command).toString('base64')
      expect(decodeSandboxedCommand(encoded)).toBe(command)
    })
  })

  describe('encode/decode round-trip', () => {
    it('should preserve command through encoding and decoding', () => {
      const commands = [
        'npm install',
        'git commit -m "message"',
        'ls -la /tmp',
        'echo "Hello, World!"',
        'python -c "print(42)"',
      ]

      for (const command of commands) {
        const encoded = encodeSandboxedCommand(command)
        const decoded = decodeSandboxedCommand(encoded)
        expect(decoded).toBe(command)
      }
    })

    it('should handle truncation in round-trip', () => {
      const longCommand = 'x'.repeat(150)
      const encoded = encodeSandboxedCommand(longCommand)
      const decoded = decodeSandboxedCommand(encoded)
      expect(decoded).toBe(longCommand.slice(0, 100))
      expect(decoded.length).toBe(100)
    })
  })
})
