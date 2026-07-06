import { jest } from '@jest/globals'
import * as core from '../__fixtures__/core.js'
import { HttpClient } from '@actions/http-client'
import * as ifm from '@actions/http-client/lib/interfaces'

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core)

import { WiremockAdmin, WmMappingsResponseBody } from '../src/wiremock-admin'

describe('WiremockAdmin', () => {
  let spyHttpClientGetJson: jest.SpyInstance

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('retrieves mappings from Wiremock admin endpoint', async () => {
    const expectedMappings = [
      {
        id: 'mapping-1',
        request: {
          urlPath: '/test',
          method: 'GET',
          headers: {}
        },
        response: {
          status: 200
        },
        uuid: 'uuid-1',
        priority: 1
      }
    ]

    spyHttpClientGetJson = jest.spyOn(HttpClient.prototype, 'getJson')

    const mappingsResponseData = {
      mappings: expectedMappings,
      meta: {
        total: expectedMappings.length
      }
    }

    spyHttpClientGetJson.mockImplementation(
      async (): Promise<ifm.TypedResponse<WmMappingsResponseBody>> => {
        return {
          statusCode: 200,
          headers: {},
          result: mappingsResponseData as WmMappingsResponseBody
        }
      }
    )

    const wiremockAdmin = new WiremockAdmin('localhost', 8080)
    const mappings = await wiremockAdmin.getMappings()

    expect(mappings).toEqual(expectedMappings)

    expect(spyHttpClientGetJson).toHaveBeenCalledWith(
      'http://localhost:8080/__admin/mappings',
      {}
    )
  })

  it.each([401, 404, 500])(
    'throws an exception on %s response',
    async (statusCode: number) => {
      spyHttpClientGetJson = jest.spyOn(HttpClient.prototype, 'getJson')

      spyHttpClientGetJson.mockImplementation(
        async (): Promise<ifm.TypedResponse<WmMappingsResponseBody>> => {
          return {
            statusCode: statusCode,
            headers: {},
            result: null
          }
        }
      )

      const wiremockAdmin = new WiremockAdmin('localhost', 8080)
      await expect(wiremockAdmin.getMappings()).rejects.toThrow(
        `Failed to get mappings: ${statusCode}`
      )
      expect(spyHttpClientGetJson).toHaveBeenCalledWith(
        'http://localhost:8080/__admin/mappings',
        {}
      )
    }
  )
})
