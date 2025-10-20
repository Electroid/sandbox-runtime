/**
 * Tests for sandbox violation store
 */

import { describe, it, expect, jest } from '@jest/globals'
import { SandboxViolationStore } from './sandbox-violation-store.js'
import { type SandboxViolationEvent } from './macos-sandbox-utils.js'
import { encodeSandboxedCommand } from './sandbox-utils.js'

describe('SandboxViolationStore', () => {
  it('should start with empty violations', () => {
    const store = new SandboxViolationStore()
    expect(store.getCount()).toBe(0)
    expect(store.getTotalCount()).toBe(0)
    expect(store.getViolations()).toEqual([])
  })

  it('should add violations', () => {
    const store = new SandboxViolationStore()
    const violation: SandboxViolationEvent = {
      line: 'test violation',
      timestamp: new Date(),
    }

    store.addViolation(violation)
    expect(store.getCount()).toBe(1)
    expect(store.getTotalCount()).toBe(1)
    expect(store.getViolations()).toEqual([violation])
  })

  it('should add multiple violations', () => {
    const store = new SandboxViolationStore()
    const violations: SandboxViolationEvent[] = [
      { line: 'violation 1', timestamp: new Date() },
      { line: 'violation 2', timestamp: new Date() },
      { line: 'violation 3', timestamp: new Date() },
    ]

    violations.forEach(v => store.addViolation(v))
    expect(store.getCount()).toBe(3)
    expect(store.getTotalCount()).toBe(3)
    expect(store.getViolations()).toEqual(violations)
  })

  it('should maintain max size of 100 violations', () => {
    const store = new SandboxViolationStore()

    // Add 150 violations
    for (let i = 0; i < 150; i++) {
      store.addViolation({
        line: `violation ${i}`,
        timestamp: new Date(),
      })
    }

    expect(store.getCount()).toBe(100)
    expect(store.getTotalCount()).toBe(150)

    // Should keep the last 100
    const violations = store.getViolations()
    expect(violations[0]?.line).toBe('violation 50')
    expect(violations[99]?.line).toBe('violation 149')
  })

  it('should get violations with limit', () => {
    const store = new SandboxViolationStore()

    for (let i = 0; i < 10; i++) {
      store.addViolation({
        line: `violation ${i}`,
        timestamp: new Date(),
      })
    }

    const limited = store.getViolations(5)
    expect(limited.length).toBe(5)
    expect(limited[0]?.line).toBe('violation 5')
    expect(limited[4]?.line).toBe('violation 9')
  })

  it('should get violations without limit', () => {
    const store = new SandboxViolationStore()

    for (let i = 0; i < 10; i++) {
      store.addViolation({
        line: `violation ${i}`,
        timestamp: new Date(),
      })
    }

    const all = store.getViolations()
    expect(all.length).toBe(10)
  })

  it('should filter violations by command', () => {
    const store = new SandboxViolationStore()
    const command1 = 'git clone repo'
    const command2 = 'npm install'

    store.addViolation({
      line: 'violation 1',
      command: command1,
      encodedCommand: encodeSandboxedCommand(command1),
      timestamp: new Date(),
    })
    store.addViolation({
      line: 'violation 2',
      command: command2,
      encodedCommand: encodeSandboxedCommand(command2),
      timestamp: new Date(),
    })
    store.addViolation({
      line: 'violation 3',
      command: command1,
      encodedCommand: encodeSandboxedCommand(command1),
      timestamp: new Date(),
    })

    const command1Violations = store.getViolationsForCommand(command1)
    expect(command1Violations.length).toBe(2)
    expect(command1Violations.every(v => v.command === command1)).toBe(true)

    const command2Violations = store.getViolationsForCommand(command2)
    expect(command2Violations.length).toBe(1)
    expect(command2Violations[0]?.command).toBe(command2)
  })

  it('should clear violations but keep total count', () => {
    const store = new SandboxViolationStore()

    for (let i = 0; i < 10; i++) {
      store.addViolation({
        line: `violation ${i}`,
        timestamp: new Date(),
      })
    }

    expect(store.getCount()).toBe(10)
    expect(store.getTotalCount()).toBe(10)

    store.clear()

    expect(store.getCount()).toBe(0)
    expect(store.getTotalCount()).toBe(10) // Total count preserved
    expect(store.getViolations()).toEqual([])
  })

  it('should notify listeners when violations are added', () => {
    const store = new SandboxViolationStore()
    const listener = jest.fn()

    store.subscribe(listener)
    expect(listener).toHaveBeenCalledTimes(1) // Called immediately on subscribe

    const violation: SandboxViolationEvent = {
      line: 'test violation',
      timestamp: new Date(),
    }
    store.addViolation(violation)

    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenLastCalledWith([violation])
  })

  it('should notify listeners when cleared', () => {
    const store = new SandboxViolationStore()
    const listener = jest.fn()

    store.addViolation({
      line: 'test violation',
      timestamp: new Date(),
    })

    store.subscribe(listener)
    expect(listener).toHaveBeenCalledTimes(1)

    store.clear()
    expect(listener).toHaveBeenCalledTimes(2)
    expect(listener).toHaveBeenLastCalledWith([])
  })

  it('should support multiple listeners', () => {
    const store = new SandboxViolationStore()
    const listener1 = jest.fn()
    const listener2 = jest.fn()

    store.subscribe(listener1)
    store.subscribe(listener2)

    const violation: SandboxViolationEvent = {
      line: 'test violation',
      timestamp: new Date(),
    }
    store.addViolation(violation)

    expect(listener1).toHaveBeenCalledWith([violation])
    expect(listener2).toHaveBeenCalledWith([violation])
  })

  it('should allow unsubscribing listeners', () => {
    const store = new SandboxViolationStore()
    const listener = jest.fn()

    const unsubscribe = store.subscribe(listener)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()

    store.addViolation({
      line: 'test violation',
      timestamp: new Date(),
    })

    expect(listener).toHaveBeenCalledTimes(1) // Not called after unsubscribe
  })

  it('should return a copy of violations array', () => {
    const store = new SandboxViolationStore()
    const violation: SandboxViolationEvent = {
      line: 'test violation',
      timestamp: new Date(),
    }
    store.addViolation(violation)

    const violations1 = store.getViolations()
    const violations2 = store.getViolations()

    expect(violations1).toEqual(violations2)
    expect(violations1).not.toBe(violations2) // Different array instances
  })

  it('should handle violations without command', () => {
    const store = new SandboxViolationStore()
    const violation: SandboxViolationEvent = {
      line: 'violation without command',
      timestamp: new Date(),
    }

    store.addViolation(violation)
    expect(store.getCount()).toBe(1)
    expect(store.getViolations()[0]).toEqual(violation)
  })

  it('should handle empty command search', () => {
    const store = new SandboxViolationStore()
    store.addViolation({
      line: 'violation 1',
      command: 'test',
      encodedCommand: encodeSandboxedCommand('test'),
      timestamp: new Date(),
    })

    const results = store.getViolationsForCommand('')
    expect(results).toEqual([])
  })

  it('should maintain timestamp accuracy', () => {
    const store = new SandboxViolationStore()
    const timestamp = new Date()
    const violation: SandboxViolationEvent = {
      line: 'test violation',
      timestamp,
    }

    store.addViolation(violation)
    const stored = store.getViolations()[0]
    expect(stored?.timestamp).toBe(timestamp)
  })
})
