/**
 * Comprehensive tests for sandbox utility functions
 * Tests core functionality including path normalization, permission building, and proxy configuration
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  containsGlobChars,
  removeTrailingGlobSuffix,
  normalizePathForSandbox,
  getDefaultWritePaths,
  generateProxyEnvVars,
  encodeSandboxedCommand,
  decodeSandboxedCommand,
  getMandatoryDenyWithinAllow,
} from './sandbox-utils.js'

describe('sandbox-utils', () => {
  describe('Path Pattern Utilities', () => {
    describe('containsGlobChars', () => {
      it('should detect asterisk wildcards', () => {
        expect(containsGlobChars('*.ts')).toBe(true)
        expect(containsGlobChars('/path/*/file')).toBe(true)
        expect(containsGlobChars('/path/**/*.ts')).toBe(true)
      })

      it('should detect question mark wildcards', () => {
        expect(containsGlobChars('file?.ts')).toBe(true)
        expect(containsGlobChars('/path/file?/test')).toBe(true)
      })

      it('should detect bracket expressions', () => {
        expect(containsGlobChars('file[0-9].ts')).toBe(true)
        expect(containsGlobChars('[abc]def')).toBe(true)
      })

      it('should return false for literal paths', () => {
        expect(containsGlobChars('/usr/bin/node')).toBe(false)
        expect(containsGlobChars('/home/user/project/file.txt')).toBe(false)
        expect(containsGlobChars('simple-filename.js')).toBe(false)
      })
    })

    describe('removeTrailingGlobSuffix', () => {
      it('should remove /** from end of path', () => {
        expect(removeTrailingGlobSuffix('/path/to/dir/**')).toBe('/path/to/dir')
        expect(removeTrailingGlobSuffix('/usr/local/**')).toBe('/usr/local')
        expect(removeTrailingGlobSuffix('relative/path/**')).toBe('relative/path')
      })

      it('should not remove /** from middle of path', () => {
        expect(removeTrailingGlobSuffix('/path/**/middle/file')).toBe('/path/**/middle/file')
      })

      it('should not modify paths without /**', () => {
        expect(removeTrailingGlobSuffix('/normal/path')).toBe('/normal/path')
        expect(removeTrailingGlobSuffix('/path/*')).toBe('/path/*')
      })
    })

    describe('normalizePathForSandbox', () => {
      const homeDir = os.homedir()

      it('should expand tilde to home directory', () => {
        expect(normalizePathForSandbox('~')).toBe(homeDir)
        expect(normalizePathForSandbox('~/Documents')).toContain(homeDir)
        expect(normalizePathForSandbox('~/Documents')).toContain('Documents')
      })

      it('should convert relative paths to absolute', () => {
        const result = normalizePathForSandbox('./test')
        expect(path.isAbsolute(result)).toBe(true)
        expect(result).toContain('test')
      })

      it('should handle parent directory references', () => {
        const result = normalizePathForSandbox('../test')
        expect(path.isAbsolute(result)).toBe(true)
      })

      it('should preserve glob patterns in absolute paths', () => {
        const result = normalizePathForSandbox('./src/**/*.ts')
        expect(result).toContain('**')
        expect(result).toContain('*.ts')
        expect(path.isAbsolute(result)).toBe(true)
      })

      it('should resolve symlinks for non-glob patterns', () => {
        const result = normalizePathForSandbox('.')
        expect(path.isAbsolute(result)).toBe(true)
        expect(result.includes('..')).toBe(false)
      })
    })
  })

  describe('Default Write Paths', () => {
    it('should return array of standard writable paths', () => {
      const paths = getDefaultWritePaths()

      expect(Array.isArray(paths)).toBe(true)
      expect(paths.length).toBeGreaterThan(0)

      expect(paths).toContain('/dev/stdout')
      expect(paths).toContain('/dev/stderr')
      expect(paths).toContain('/dev/null')
      expect(paths).toContain('/dev/tty')
      expect(paths).toContain('.')

      const npmLogsPath = paths.find(p => p.includes('.npm/_logs'))
      expect(npmLogsPath).toBeDefined()
      expect(path.isAbsolute(npmLogsPath!)).toBe(true)
    })

    it('should not contain duplicate paths', () => {
      const paths = getDefaultWritePaths()
      const uniquePaths = new Set(paths)
      expect(paths.length).toBe(uniquePaths.size)
    })
  })

  describe('Mandatory Deny Paths', () => {
    let tempDir: string
    let originalCwd: string

    beforeEach(async () => {
      originalCwd = process.cwd()
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-test-'))
      process.chdir(tempDir)
    })

    afterEach(async () => {
      process.chdir(originalCwd)
      if (tempDir && fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('should identify dangerous files in current directory', async () => {
      fs.writeFileSync(path.join(tempDir, '.bashrc'), '# test')
      fs.writeFileSync(path.join(tempDir, '.gitconfig'), '# test')

      const denyPaths = await getMandatoryDenyWithinAllow()

      expect(denyPaths.some(p => p.includes('.bashrc'))).toBe(true)
      expect(denyPaths.some(p => p.includes('.gitconfig'))).toBe(true)
      expect(denyPaths.some(p => p.includes('.claude') && p.includes('settings.json'))).toBe(true)
    })

    it('should identify .git/hooks and .git/config as dangerous', async () => {
      const gitDir = path.join(tempDir, '.git')
      fs.mkdirSync(gitDir, { recursive: true })
      fs.mkdirSync(path.join(gitDir, 'hooks'))
      fs.writeFileSync(path.join(gitDir, 'config'), '# git config')
      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main')

      const denyPaths = await getMandatoryDenyWithinAllow()

      expect(denyPaths.some(p => p.endsWith('.git/hooks') || p.includes('.git/hooks'))).toBe(true)
      expect(denyPaths.some(p => p.endsWith('.git/config') || p.includes('.git/config'))).toBe(true)
    })
  })

  describe('Proxy Environment Variables', () => {
    it('should generate minimal env vars when no ports provided', () => {
      const envVars = generateProxyEnvVars()
      expect(envVars).toContain('SANDBOX_RUNTIME=1')
      expect(envVars.length).toBe(1)
    })

    it('should generate HTTP proxy environment variables', () => {
      const envVars = generateProxyEnvVars(8080)

      expect(envVars).toContain('SANDBOX_RUNTIME=1')
      expect(envVars).toContain('HTTP_PROXY=http://localhost:8080')
      expect(envVars).toContain('HTTPS_PROXY=http://localhost:8080')
      expect(envVars).toContain('http_proxy=http://localhost:8080')
      expect(envVars).toContain('https_proxy=http://localhost:8080')

      const noProxy = envVars.find(v => v.startsWith('NO_PROXY='))
      expect(noProxy).toBeDefined()
      expect(noProxy).toContain('localhost')
      expect(noProxy).toContain('127.0.0.1')
    })

    it('should generate SOCKS proxy environment variables', () => {
      const envVars = generateProxyEnvVars(undefined, 1080)

      expect(envVars).toContain('ALL_PROXY=socks5h://localhost:1080')
      expect(envVars).toContain('all_proxy=socks5h://localhost:1080')
      expect(envVars).toContain('FTP_PROXY=socks5h://localhost:1080')
      expect(envVars).toContain('RSYNC_PROXY=localhost:1080')
      expect(envVars).toContain('GRPC_PROXY=socks5h://localhost:1080')
    })

    it('should generate both HTTP and SOCKS when both ports provided', () => {
      const envVars = generateProxyEnvVars(8080, 1080)

      expect(envVars.some(v => v.includes('HTTP_PROXY'))).toBe(true)
      expect(envVars.some(v => v.includes('ALL_PROXY'))).toBe(true)
      expect(envVars.some(v => v.includes('DOCKER_HTTP_PROXY'))).toBe(true)
      expect(envVars).toContain('CLOUDSDK_PROXY_TYPE=https')
      expect(envVars).toContain('CLOUDSDK_PROXY_ADDRESS=localhost')
      expect(envVars).toContain('CLOUDSDK_PROXY_PORT=8080')
    })
  })

  describe('Command Encoding/Decoding', () => {
    it('should encode and decode commands correctly', () => {
      const commands = [
        'git clone https://github.com/user/repo.git',
        'npm install @package/name',
        'echo "Hello, World!"',
        'ls -la /usr/local/bin',
      ]

      for (const cmd of commands) {
        const encoded = encodeSandboxedCommand(cmd)
        const decoded = decodeSandboxedCommand(encoded)
        expect(decoded).toBe(cmd)
      }
    })

    it('should truncate commands longer than 100 characters', () => {
      const longCmd = 'x'.repeat(150)
      const encoded = encodeSandboxedCommand(longCmd)
      const decoded = decodeSandboxedCommand(encoded)

      expect(decoded.length).toBe(100)
      expect(decoded).toBe('x'.repeat(100))
    })

    it('should handle Unicode characters', () => {
      const unicodeCmd = 'echo "Hello 世界 🌍"'
      const encoded = encodeSandboxedCommand(unicodeCmd)
      const decoded = decodeSandboxedCommand(encoded)
      expect(decoded).toBe(unicodeCmd)
    })

    it('should produce base64 encoded strings', () => {
      const cmd = 'test command'
      const encoded = encodeSandboxedCommand(cmd)
      expect(/^[A-Za-z0-9+/=]*$/.test(encoded)).toBe(true)
      expect(encoded).toBe(Buffer.from(cmd).toString('base64'))
    })
  })
})
