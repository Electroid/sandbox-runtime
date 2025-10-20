/**
 * Tests for debug logging utilities
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { logForDebugging } from './debug.js'

describe('debug', () => {
  describe('logForDebugging', () => {
    let consoleLogSpy: jest.SpiedFunction<typeof console.log>
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>
    let consoleWarnSpy: jest.SpiedFunction<typeof console.warn>
    let originalDebug: string | undefined

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
      originalDebug = process.env.DEBUG
    })

    afterEach(() => {
      consoleLogSpy.mockRestore()
      consoleErrorSpy.mockRestore()
      consoleWarnSpy.mockRestore()
      if (originalDebug === undefined) {
        delete process.env.DEBUG
      } else {
        process.env.DEBUG = originalDebug
      }
    })

    it('should not log when DEBUG is not set', () => {
      delete process.env.DEBUG
      logForDebugging('test message')
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('should log with info level when DEBUG is set', () => {
      process.env.DEBUG = '1'
      logForDebugging('test message')
      expect(consoleLogSpy).toHaveBeenCalledWith('[SandboxDebug] test message')
    })

    it('should log with error level when specified', () => {
      process.env.DEBUG = '1'
      logForDebugging('error message', { level: 'error' })
      expect(consoleErrorSpy).toHaveBeenCalledWith('[SandboxDebug] error message')
    })

    it('should log with warn level when specified', () => {
      process.env.DEBUG = '1'
      logForDebugging('warning message', { level: 'warn' })
      expect(consoleWarnSpy).toHaveBeenCalledWith('[SandboxDebug] warning message')
    })

    it('should default to info level when no level specified', () => {
      process.env.DEBUG = '1'
      logForDebugging('default message', {})
      expect(consoleLogSpy).toHaveBeenCalledWith('[SandboxDebug] default message')
    })

    it('should not log error when DEBUG is not set', () => {
      delete process.env.DEBUG
      logForDebugging('error message', { level: 'error' })
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should not log warn when DEBUG is not set', () => {
      delete process.env.DEBUG
      logForDebugging('warn message', { level: 'warn' })
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })
  })
})
