/**
 * Tests for settings utilities
 */

import { describe, it, expect } from '@jest/globals'
import {
  permissionRuleValueFromString,
  WEB_FETCH_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_READ_TOOL_NAME,
} from './settings.js'

describe('settings', () => {
  describe('permissionRuleValueFromString', () => {
    it('should parse tool name without rule content', () => {
      const result = permissionRuleValueFromString('WebFetch')
      expect(result).toEqual({
        toolName: 'WebFetch',
        ruleContent: undefined,
      })
    })

    it('should parse tool name with rule content', () => {
      const result = permissionRuleValueFromString('WebFetch(*.example.com)')
      expect(result).toEqual({
        toolName: 'WebFetch',
        ruleContent: '*.example.com',
      })
    })

    it('should parse Edit tool with file pattern', () => {
      const result = permissionRuleValueFromString('Edit(src/**/*.ts)')
      expect(result).toEqual({
        toolName: 'Edit',
        ruleContent: 'src/**/*.ts',
      })
    })

    it('should parse Read tool with file pattern', () => {
      const result = permissionRuleValueFromString('Read(/etc/hosts)')
      expect(result).toEqual({
        toolName: 'Read',
        ruleContent: '/etc/hosts',
      })
    })

    it('should handle tool name with spaces', () => {
      const result = permissionRuleValueFromString('Tool Name(rule)')
      expect(result).toEqual({
        toolName: 'Tool Name',
        ruleContent: 'rule',
      })
    })

    it('should handle empty rule content', () => {
      const result = permissionRuleValueFromString('WebFetch()')
      expect(result).toEqual({
        toolName: 'WebFetch',
        ruleContent: '',
      })
    })

    it('should trim whitespace from tool name', () => {
      const result = permissionRuleValueFromString('  WebFetch  ')
      expect(result).toEqual({
        toolName: 'WebFetch',
        ruleContent: undefined,
      })
    })

    it('should trim whitespace from rule content', () => {
      const result = permissionRuleValueFromString('WebFetch(  *.example.com  )')
      expect(result).toEqual({
        toolName: 'WebFetch',
        ruleContent: '*.example.com',
      })
    })

    it('should handle complex rule patterns', () => {
      const result = permissionRuleValueFromString(
        'Edit(/path/to/file/{pattern}/*.ts)',
      )
      expect(result).toEqual({
        toolName: 'Edit',
        ruleContent: '/path/to/file/{pattern}/*.ts',
      })
    })

    it('should reject nested parentheses in rule content', () => {
      // Nested parentheses are not supported by the regex pattern
      expect(() => permissionRuleValueFromString('Tool(rule(with)parens)')).toThrow(
        'Invalid permission rule format',
      )
    })

    it('should throw on invalid format', () => {
      expect(() => permissionRuleValueFromString('(invalid')).toThrow(
        'Invalid permission rule format',
      )
    })

    it('should handle rules with special characters', () => {
      const result = permissionRuleValueFromString('WebFetch(api.example.com:443)')
      expect(result).toEqual({
        toolName: 'WebFetch',
        ruleContent: 'api.example.com:443',
      })
    })

    it('should handle rules with wildcards', () => {
      const result = permissionRuleValueFromString('Read(~/.config/**/*)')
      expect(result).toEqual({
        toolName: 'Read',
        ruleContent: '~/.config/**/*',
      })
    })
  })

  describe('tool name constants', () => {
    it('should export WebFetch tool name', () => {
      expect(WEB_FETCH_TOOL_NAME).toBe('WebFetch')
    })

    it('should export Edit tool name', () => {
      expect(FILE_EDIT_TOOL_NAME).toBe('Edit')
    })

    it('should export Read tool name', () => {
      expect(FILE_READ_TOOL_NAME).toBe('Read')
    })
  })
})
