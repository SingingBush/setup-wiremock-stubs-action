/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'

import { WiremockAdmin, WmMapping } from '../src/wiremock-admin.js'

import fs from 'fs'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

const mockreaddirSync = jest.spyOn(fs, 'readdirSync')
const mockreadFileSync = jest.spyOn(fs, 'readFileSync')

const getMappingsSpy = jest.spyOn(WiremockAdmin.prototype, 'getMappings')
const postMappingsSpy = jest.spyOn(WiremockAdmin.prototype, 'postMappings')

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('Runs without throwing an error', async () => {
    core.getInput.mockImplementation((name: string) => {
      return name === 'port' ? '4444' : '/path/to/mappings'
    })

    mockreaddirSync.mockReturnValueOnce([
      { name: 'mapping1.json', isFile: () => true, isDirectory: () => false },
      { name: 'mapping2.json', isFile: () => true, isDirectory: () => false },
      { name: 'subdir', isFile: () => false, isDirectory: () => true }
    ] as fs.Dirent[])

    mockreadFileSync.mockReturnValue('{}')

    const mockGetMappings = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve([] as WmMapping[]))
      .mockReturnValueOnce(Promise.resolve([{}, {}] as WmMapping[]))

    const mockPostMappings = jest.fn(() => Promise.resolve())

    getMappingsSpy.mockImplementation(mockGetMappings)
    postMappingsSpy.mockImplementation(mockPostMappings)

    await run()

    expect(core.getInput).toHaveBeenCalledWith('mappings', { required: true })
    expect(core.getInput).toHaveBeenCalledWith('port')

    expect(core.setFailed).not.toHaveBeenCalled()

    expect(mockGetMappings).toHaveBeenCalledTimes(2)
    expect(mockPostMappings).toHaveBeenCalledTimes(2)

    expect(core.setOutput).toHaveBeenCalledWith('count', 2)
  })

  it('Sets a failed status with invalid port value', async () => {
    core.getInput.mockImplementation((name: string) => {
      return name === 'port' ? 'this is not a number' : ''
    })

    await run()

    expect(core.getInput).toHaveBeenCalledWith('mappings', { required: true })
    expect(core.getInput).toHaveBeenCalledWith('port')

    // Verify that the action was marked as failed.
    expect(core.setFailed).toHaveBeenCalledTimes(1)
    expect(core.setFailed).toHaveBeenCalledWith(
      'Failed to parse integer from value: this is not a number'
    )
  })
})
