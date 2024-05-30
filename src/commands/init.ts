// @/commands/init
// `registry init` command
// Creates a new registry instance

import path from 'path'

import {
	CLIEvent,
	RegistrySetupOptions,
	Toolbox,
	SignatureOptions,
	Auxiliary_Services,
	PortalAdminUser,
} from '../types'
import { config } from '../config/config'

export default {
	name: 'init',
	run: async (toolbox: Toolbox) => {
		const {
			environment,
			events,
			filesystem,
			print,
			prompt,
			registry,
			strings,
			handleEvent,
		} = toolbox

		let lenghtOfAuxilaryServices: number = Object.keys(
			config.auxiliary_services
		).length
		// Function to print a URL Hyper Link
		let printURL = (url: string, linkText: string) => {
			// ANSI escape codes to format the link
			const formattedLink = `\u001b]8;;${url}\u0007${linkText}\u001b]8;;\u0007`
			return print.info(
				print.colors.green.bold(`Ctrl click here --> ${formattedLink}.`)
			)
		}

		// Funtion to print a Higlight
		let printHighlight = (message: string) => {
			print.highlight(message)
		}

		events.on('environment.check', handleEvent)
		events.on('registry.create', handleEvent)

		// Print the title
		print.info('')
		print.info(print.colors.green.bold('Registry Setup'))
		print.info('')

		// Check that all tools are installed
		await environment.check()

		// Check if a registry already exists in the current directory
		if (
			await filesystem.existsAsync(path.resolve(process.cwd(), 'registry.yaml'))
		) {
			events.emit('registry.create', {
				status: 'error',
				operation: 'checking-env',
				message: `A registry has already been setup in the current directory.`,
			})
		}

		// v1.0.0 details
		// print.info('')
		// print.info(print.colors.magenta.bold('v1.0.0') + print.colors.cyan.italic('If you are here to use the reference solutions for digital credentialing, such as the administration or issuance portal, we recommend proceeding with version v1.0.0.'));
		// print.info('')

		// // v2.0.0 details
		// print.info('')
		// print.info(print.colors.magenta.bold('v2.0.0'))
		// print.info('')

		const optionsForVersionSelection = await prompt.ask([
			{
				type: 'select',
				message:
					print.colors.reset(
						'Please specify which version of the registry you would like to use?'
					) +
					print.colors.yellow(
						` - If you are here to use the reference solutions for digital credentialing, such as the administration or issuance portal, we recommend proceeding with version v1.0.0. Else use the latest release  v2.0.0`
					),
				name: 'version',
				choices: Object.keys(config.versions),
			},
		])

		// Get neccesary information
		print.info('')
		let promptOptions = [
			{
				type: 'input',
				message: print.colors.reset('Enter the name of the registry'),
				name: 'registryName',
				initial: strings.startCase(
					process.cwd().split('/').slice(-1).join('/')
				),
			},
			{
				type: 'input',
				message: print.colors.reset(
					'Enter the name of the Keycloak realm to create'
				),
				name: 'realmName',
				initial: 'sunbird-rc',
			},
			{
				type: 'input',
				message: print.colors.reset(
					'Enter the ID to assign to the admin client in Keycloak'
				),
				name: 'keycloakAdminClientId',
				initial: 'admin-api',
			},
			{
				type: 'input',
				message: print.colors.reset(
					'Enter the ID to assign to the frontend client in Keycloak'
				),
				name: 'keycloakFrontendClientId',
				initial: 'registry-frontend',
			},
			{
				type: 'input',
				message: print.colors.reset(
					'Enter a username for the admin account in Keycloak'
				),
				name: 'keycloakAdminUser',
				initial: 'admin',
			},
			{
				type: 'input',
				message: print.colors.reset(
					'Enter a password for the admin account in Keycloak'
				),
				name: 'keycloakAdminPass',
				initial: 'admin',
			},
			{
				type: 'confirm',
				message:
					print.colors.reset('Enable authentication') +
					print.colors.yellow(
						`(Enabling this will help you authenticate the enitity for crud operations based on the roles configuration defined in your schema)`
					),
				name: 'enableRegistryAuthentication',
				initial: true,
			},
			{
				type: 'confirm',
				message: print.colors.reset(
					'Do you want to create entities asynchronously'
				),
				name: 'asyncEnabled',
				initial: false,
			},
			{
				type: 'confirm',
				message: print.colors.reset('Enable attestation workflow'),
				name: 'enableAttestation',
				initial: false,
			},
			{
				type: 'confirm',
				message:
					print.colors.reset('Enable elastic search ') +
					print.colors.yellow(
						`(This will make sure your search queries are much faster)`
					),
				name: 'elasticSearchEnabled',
				initial: false,
			},
			{
				type: 'confirm',
				message:
					print.colors.reset('Do you want to issue verifiable credentials ') +
					print.colors.yellow(
						`(This will enable cerificate api service which is used to generate certificates)`
					),
				name: 'enableVCIssuance',
				initial: false,
			},
			{
				type: 'select',
				message:
					print.colors.reset(
						'How do you want to persist the schema definitions '
					) +
					print.colors.yellow(
						` - if using a single instance of registry, set this value to Definitions Manager which save's the schema definations runtime. Else, set it to Distributed Definitions Manager which persists the schema defiantions in redis`
					),
				name: 'managerType',
				choices: Object.keys(config.definationMangerTypes),
			},
		]
		if (
			optionsForVersionSelection?.version === Object.keys(config.versions)[1]
		) {
			promptOptions.splice(10, 1)
		}

		const options = await prompt.ask(promptOptions)

		let autoGenerateKeyOptions = {}
		let signatureOptions: SignatureOptions = {
			signatureEnabled: false,
		}
		let importdirectories = {}
		let auxiliaryServices: Auxiliary_Services = {
			auxiliaryServicesToBeEnabled: [],
		}

		// Checks for enabling the signature service if attestation flow is not enabled
		if (!options.enableAttestation) {
			signatureOptions = await prompt.ask([
				{
					type: 'confirm',
					message:
						print.colors.reset('Enable signing ') +
						print.colors.yellow(
							`(Enabling this will make sure to create a signature for a document/entity by using the credential template defined in your schema)`
						),
					name: 'signatureEnabled',
					initial: false,
				},
			])
		} else {
			signatureOptions.signatureEnabled = true
		}

		// This is specific to v1.0.0 of registry
		// Check for auto generation of keys if signature service is enabled
		if (
			signatureOptions?.signatureEnabled &&
			optionsForVersionSelection?.version === Object.keys(config.versions)[0]
		) {
			autoGenerateKeyOptions = await prompt.ask([
				{
					type: 'confirm',
					message:
						print.colors.reset(
							'Generate new public/private keys for signing '
						) + print.colors.yellow(` - or use the default keys`),
					name: 'autoGenerateKeys',
					initial: false,
				},
			])
		}

		// Checks for import directories for schemas and consent module
		importdirectories = await prompt.ask([
			{
				type: 'input',
				message: print.colors.reset(
					'Enter the path to a directory containing entity schemas'
				),
				name: 'pathToEntitySchemas',
				initial: 'use-example-config',
			},
			{
				type: 'input',
				message: print.colors.reset(
					'Enter the path to a file containing consent configuration'
				),
				name: 'pathToConsentConfiguration',
				initial: 'use-example-config',
			},
		])

		const url =
			'https://docs.sunbirdrc.dev/developer-documentation/notifications-configuration'
		const linkText =
			'for more details about Sunbird RC configurations and its axuiliary services under the Developer Documentation'
		print.info('')
		printURL(url, linkText)

		// Checks for auxiliary services if needed
		auxiliaryServices = await prompt.ask([
			{
				type: 'multiselect',
				name: 'auxiliaryServicesToBeEnabled',
				message:
					print.colors.highlight(
						'Sunbird RC offers a variety of auxiliary services to improve platform functionality.'
					) + print.colors.magenta('- Use SPACE BAR to select and unselect.'),
				choices:
					optionsForVersionSelection?.version ===
					Object.keys(config.versions)[0]
						? Object.keys(config.auxiliary_services)
						: //edit the count if you are adding any new auxilary services
						  Object.keys(config.auxiliary_services).splice(
								0,
								6
						  ).concat(Object.keys(config.auxiliary_services).splice(
							8,
							2
					  )),
			},
		])

		print.info('')

		// The Issuer and Admin portals are compatable with v1.0.0 of registry
		let portalUserCredOptions: PortalAdminUser = {
			portalAdminUser: '',
		}
		if (
			optionsForVersionSelection?.version === Object.keys(config.versions)[0] &&
			(auxiliaryServices.auxiliaryServicesToBeEnabled.includes(
				Object.keys(config.auxiliary_services)[7]
			) ||
				auxiliaryServices.auxiliaryServicesToBeEnabled.includes(
					Object.keys(config.auxiliary_services)[6]
				))
		) {
			portalUserCredOptions = await prompt.ask([
				{
					type: 'input',
					message: print.colors.reset(
						'Enter a username for creating a user to access portal/portals'
					),
					name: 'portalAdminUser',
					initial: 'portalAdmin',
				},
			])
		}

		let optionsToCheck = {
			...optionsForVersionSelection,
			...options,
			...signatureOptions,
			...importdirectories,
			...autoGenerateKeyOptions,
			...auxiliaryServices,
			...portalUserCredOptions,
		}
		// Setup the registry
		// print.debug(options);
		await registry.create(optionsToCheck as unknown as RegistrySetupOptions)

		print.info('')
		if (
			optionsForVersionSelection?.version === Object.keys(config.versions)[0] &&
			(auxiliaryServices.auxiliaryServicesToBeEnabled.includes(
				Object.keys(config.auxiliary_services)[7]
			) ||
				auxiliaryServices.auxiliaryServicesToBeEnabled.includes(
					Object.keys(config.auxiliary_services)[6]
				))
		) {
			let message = `You can use ${optionsToCheck.portalAdminUser} as your Username to login to the portal/portal with the default password ( abcd@123 ). You can reset it by loging into keycloak `
			print.success(message)
		}
		print.info('')

		print.info('')
		if (
			optionsForVersionSelection?.version === Object.keys(config.versions)[0]
		) {
			if (options?.autoGenerateKeys) {
				printHighlight(
					'Sunbird-RC is configured with auto generated keys for signing.'
				)
			} else {
				printHighlight(
					'Sunbird-RC is configured with test/default keys for signing. It is required to be updated `imports/config.json` before going live/production'
				)
			}
		} else {
			printHighlight(
				'Sunbird-RC is using HashCorp Vault as the keystore manager. For more information you can refer below'
			)
			printURL('https://www.hashicorp.com/products/vault', 'HashiCorp Vault')
		}
	},
}
