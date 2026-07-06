import * as core from '@actions/core'
import { HttpClient, HttpClientResponse } from '@actions/http-client'

interface WmRequest {
  urlPath: string
  method: string
  headers: object
}

export interface WmResponse {
  status: number
  jsonBody?: object
  proxyBaseUrl?: string
}

export interface WmMapping {
  id: string
  request: WmRequest
  response: WmResponse
  uuid: string
  priority: number
}

export interface WmMappingsResponseBody {
  mappings: WmMapping[]
  meta: {
    total: number
  }
}

export class WiremockAdmin {
  private hostname: string
  private httpPort: number
  private httpClient: HttpClient

  constructor(hostname: string = 'localhost', httpPort: number = 8080) {
    this.hostname = hostname
    this.httpPort = httpPort
    this.httpClient = new HttpClient('GH Actions Wiremock Admin Client', [], {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    })
  }

  public async getMappings(): Promise<WmMapping[]> {
    // {
    //     "mappings": [],
    //     "meta": {
    //       "total": 0
    //     }
    // }
    const response = await this.httpClient.getJson<WmMappingsResponseBody>(
      `http://${this.hostname}:${this.httpPort}/__admin/mappings`,
      {}
    )

    if (response.statusCode !== 200) {
      throw new Error(`Failed to get mappings: ${response.statusCode}`)
    }

    const body: WmMappingsResponseBody | null = response.result
    core.debug(`Wiremock returned ${body?.meta.total} mappings`)
    return body?.mappings || []
  }

  public async postMappings(obj: object): Promise<HttpClientResponse> {
    // use postJson<WmMappings>

    const body = JSON.stringify(obj)
    return await this.httpClient.post(
      `http://${this.hostname}:${this.httpPort}/__admin/mappings`,
      body
    )
  }
}
