import * as core from '@actions/core'
import * as path from 'path'
import fs from 'fs'
import { WiremockAdmin } from './wiremock-admin.js'

function parseIntOrError(value: string): number {
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new Error(`Failed to parse integer from value: ${value}`)
  }
  return parsed
}

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // const ms: string = core.getInput('milliseconds')
    const wiremock_mappings_dir: string = core.getInput('mappings', {
      required: true
    })
    const wiremock_port: string = core.getInput('port') || '8080'

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(
      `args: '${wiremock_mappings_dir}', wiremock port: ${wiremock_port}`
    )

    // Create a WiremockAdmin instance to interact with the Wiremock admin API
    const wiremockAdmin: WiremockAdmin = new WiremockAdmin(
      'localhost',
      parseIntOrError(wiremock_port)
    )

    // core.toPlatformPath(mappingsPath)
    //const wiremock_mappings_dir = path.join(cwd, "mappings");
    // const wiremockFilesPath = path.join(cwd, "__files");

    const files: fs.Dirent[] = fs.readdirSync(wiremock_mappings_dir, {
      withFileTypes: true
    })

    wiremockAdmin
      .getMappings()
      .then((mappings) => {
        core.info(
          `Retrieved ${mappings.length} mappings from Wiremock admin endpoint.`
        )
      })
      .catch((error) => {
        core.setFailed(`Failed to retrieve mappings: ${error.message}`)
      })

    for (const file of files) {
      if (file.isDirectory()) {
        core.warning(
          `Skipping directory ${file.name} in mappings path as recursively reading directories is not supported.`
        )
      } else if (path.extname(file.name) === '.json') {
        const content = fs
          .readFileSync(path.join(wiremock_mappings_dir, file.name), 'utf8')
          .trim()

        core.info(
          `Posting ${path.join(wiremock_mappings_dir, file.name)} to Wiremock.`
        )

        wiremockAdmin
          .postMappings(JSON.parse(content))
          .then((response) => {
            core.info(
              `Posted mapping from file ${file.name} to Wiremock admin endpoint. Response status: ${response.message.statusCode}`
            )
          })
          .catch((error) => {
            core.setFailed(
              `Failed to post mapping from file ${file.name}: ${error.message}`
            )
          })
      }
    }

    wiremockAdmin
      .getMappings()
      .then((mappings) => {
        core.info(
          `Retrieved ${mappings.length} mappings from Wiremock admin endpoint.`
        )
      })
      .catch((error) => {
        core.setFailed(`Failed to retrieve mappings: ${error.message}`)
      })

    // Set outputs for other workflow steps to use
    //core.setOutput('time', new Date().toTimeString())
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed(`An unexpected error occurred: ${error}`)
    }
  }
}
