// @/toolbox/registry/create
// Create a new registry instance in the current directory

import path from 'path'

import KeycloakWrapper from './helpers/keycloak'
import { allUp } from './status'
import { config } from '../../config/config'
var keypair = require('keypair')

import { RegistrySetupOptions, Toolbox } from '../../types'
import formatKey from '../utils'
import RegistryWrapper from './helpers/registry'

// Accept a toolbox and configuration, create a registry instance in return
export default async (toolbox: Toolbox, setupOptions: RegistrySetupOptions) => {
	const { events, filesystem, patching, system, template, until } = toolbox
	const keycloak = new KeycloakWrapper({
		user: setupOptions.keycloakAdminUser,
		pass: setupOptions.keycloakAdminPass,
		realm: setupOptions.realmName,
	})
	const registry = new RegistryWrapper()

	// check for registry version
	let registryVersion = setupOptions.version

	let enableTheseServices = [
		config.docker_service_name.DB,
		config.docker_service_name.REGISTRY,
		config.docker_service_name.KEYCLOAK,
	]

	// By default set it for v1.0.0
	setupOptions['signatureProvideName'] =
		config.DEFAULT_V1_SIGNATURE_PROVIDER_NAME
	setupOptions['releaseVersion'] = Object.values(config.versions)[1]
	setupOptions['oauthResourceURI'] = config.DEFAULT_V2_OAUTH_RESOURCE_URI

	// if registry is v2.0.0
	if (registryVersion === Object.keys(config.versions)[1]) {
		setupOptions['signatureProvideName'] =
			config.DEFAULT_V2_SIGNATURE_PROVIDER_NAME
		setupOptions.didEnabled = true
		enableTheseServices.push(
			config.docker_service_name.CREDENTIAL_SERVICE,
			config.docker_service_name.CREDENTIAL_SCHEMA_SERVICE,
			config.docker_service_name.IDENTITY_SERVICE
		)
	}

	setupOptions.fileStorageEnabled = false

	// Enable redis for distributed systems
	if (
		setupOptions?.managerType === Object.keys(config.definationMangerTypes)[1]
	) {
		enableTheseServices.push(config.docker_service_name.REDIS)
	}

	//Enable claims for attestation work flows
	if (setupOptions?.enableAttestation) {
		enableTheseServices.push(config.docker_service_name.CLAIMS_MS)
	}

	// Enable necessary services for Issuance and Admin portal
	if (
		setupOptions.auxiliaryServicesToBeEnabled.includes(
			Object.keys(config.auxiliary_services)[7]
		) ||
		setupOptions.auxiliaryServicesToBeEnabled.includes(
			Object.keys(config.auxiliary_services)[6]
		)
	) {
		setupOptions.signatureEnabled = true
		setupOptions.enableVCIssuance = true
	}

	// Enable Encryption Service 
	if (setupOptions.auxiliaryServicesToBeEnabled.includes(
		Object.keys(config.auxiliary_services)[8]
	)) {
		setupOptions.encyptionEnabled = true
	}

	// Enable Id-Gen Service 
	if (setupOptions.auxiliaryServicesToBeEnabled.includes(
		Object.keys(config.auxiliary_services)[9]
	)) {
		setupOptions.idGenEnabled = true
	}
	//Enable Certificate Signer service
	if (
		setupOptions?.signatureEnabled &&
		registryVersion === Object.keys(config.versions)[0]
	) {
		enableTheseServices.push(
			config.docker_service_name.CERTIFICATE_SIGHNER,
			config.docker_service_name.FILE_STORAGE
		)
		setupOptions.fileStorageEnabled = true
	}

	// Set ManagerType
	setupOptions.managerType =
		config.definationMangerTypes[setupOptions?.managerType]

	// Check and Enable Elastic Search
	if (setupOptions?.elasticSearchEnabled) {
		setupOptions['searchProvideName'] = config.DEFAULT_ES_PROVIDER_NAME
		enableTheseServices.unshift(config.docker_service_name.ES)
	} else setupOptions['searchProvideName'] = config.DEFAULT_NS_PROVIDER_NAME

	// Check and Enable Kafka
	if (setupOptions?.asyncEnabled) {
		enableTheseServices.push(config.docker_service_name.KAFKA)
	}

	// enable certificate API service
	if (setupOptions?.enableVCIssuance) {
		enableTheseServices.push(
			config.docker_service_name.CERTIFICATE_API,
			config.docker_service_name.FILE_STORAGE
		)
		setupOptions.fileStorageEnabled = true
	}

	// enable Auxiliary services
	if (setupOptions?.auxiliaryServicesToBeEnabled.length > 0) {
		setupOptions?.auxiliaryServicesToBeEnabled.forEach((i: string) =>
			enableTheseServices.push(config.auxiliary_services[i])
		)
	}

	// Check for metrics and enable the events enabled flag on for registry
	if (
		setupOptions.auxiliaryServicesToBeEnabled.includes(
			Object.keys(config.auxiliary_services)[3]
		)
	) {
		setupOptions.eventEnabled = true
	} else setupOptions.eventEnabled = false

	// console.log(setupOptions);
	let dockerCommand = 'docker compose up -d '
	let conditionalEnablinOfDockerCommand =
		dockerCommand + enableTheseServices.join(' ')
	// console.log(conditionalEnablinOfDockerCommand);

	// Copy over config files with the proper variables
	events.emit('registry.create', {
		status: 'progress',
		operation: 'copying-files',
		message: 'Copying over necessary files',
	})
	template.generate({
		template: 'registry.yaml',
		target: 'registry.yaml',
		props: setupOptions,
	})
	template.generate({
		template: 'docker-compose.yml',
		target: 'docker-compose.yml',
		props: setupOptions,
	})
	template.generate({
		template: '.env',
		target: '.env',
		props: setupOptions,
	})
	template.generate({
		template: '.env-cli',
		target: '.env-cli',
		props: setupOptions,
	})
	if (registryVersion === Object.keys(config.versions)[1]) {
		template.generate({
			template: 'setup_vault.sh',
			target: 'setup_vault.sh',
			props: setupOptions,
		})
		template.generate({
			template: 'vault.json',
			target: 'vault.json',
			props: setupOptions,
		})
	}
	template.generate({
		template: 'config.json',
		target: 'imports/config.json',
		props: setupOptions,
	})
	template.generate({
		template: 'config/keycloak/realm-export.json',
		target: 'imports/realm-export.json',
		props: setupOptions,
	})

	if (registryVersion === Object.keys(config.versions)[0]) {
		template.generate({
			template: 'config/admin-portal/config.json',
			target: 'imports/admin-portal/config.json',
			props: setupOptions,
		})
		template.generate({
			template: 'config/admin-portal/nginx.conf',
			target: 'imports/admin-portal/nginx.conf',
			props: setupOptions,
		})
		template.generate({
			template: 'config/Issuance-portal/config.json',
			target: 'imports/Issuance-portal/config.json',
			props: setupOptions,
		})
		template.generate({
			template: 'config/Issuance-portal/nginx.conf',
			target: 'imports/Issuance-portal/nginx.conf',
			props: setupOptions,
		})
	}
	if (setupOptions.pathToEntitySchemas === 'use-example-config') {
		template.generate({
			template: 'config/schemas/student.json',
			target: 'config/schemas/student.json',
			props: setupOptions,
		})
		template.generate({
			template: 'config/schemas/teacher.json',
			target: 'config/schemas/teacher.json',
			props: setupOptions,
		})
	} else {
		await filesystem
			.copyAsync(
				path.resolve(setupOptions.pathToEntitySchemas),
				path.resolve(process.cwd(), 'config/schemas/'),
				{ overwrite: true }
			)
			.catch((error: Error) => {
				events.emit('registry.create', {
					status: 'error',
					operation: 'copying-files',
					message: `An unexpected error occurred while copying the schema files: ${error.message}`,
				})
			})
	}

	if (
		setupOptions.auxiliaryServicesToBeEnabled.includes(
			Object.keys(config.auxiliary_services)[7]
		) ||
		setupOptions.auxiliaryServicesToBeEnabled.includes(
			Object.keys(config.auxiliary_services)[6]
		)
	) {
		setupOptions['oauthResourceURI'] = config.DEFAULT_V1_OAUTH_RESOURCE_URI
		template.generate({
			template: 'config/schemas/v1/Issuer.json',
			target: 'config/schemas/Issuer.json',
			props: setupOptions,
		})
		if (
			setupOptions.auxiliaryServicesToBeEnabled.includes(
				Object.keys(config.auxiliary_services)[7]
			)
		) {
			template.generate({
				template: 'config/schemas/v1/DocumentType.json',
				target: 'config/schemas/DocumentType.json',
				props: setupOptions,
			})
		}
	}

	if (setupOptions.pathToConsentConfiguration === 'use-example-config') {
		template.generate({
			template: 'config/consent.json',
			target: 'config/consent.json',
			props: setupOptions,
		})
	} else {
		await filesystem
			.copyAsync(
				path.resolve(setupOptions.pathToConsentConfiguration),
				path.resolve(process.cwd(), 'config/consent.json'),
				{ overwrite: true }
			)
			.catch((error: Error) => {
				events.emit('registry.create', {
					status: 'error',
					operation: 'copying-files',
					message: `An unexpected error occurred while copying the consent configuration: ${error.message}`,
				})
			})
	}

	// Auto generation of keys logic
	if (setupOptions?.autoGenerateKeys) {
		// Specify the path to the config.json file
		const configFilePath = 'imports/config.json'
		let deafultTemplateForKeys = await filesystem.read(
			path.resolve(process.cwd(), configFilePath),
			'json'
		)
		var pair = keypair()
		deafultTemplateForKeys.issuers.default.publicKey = formatKey(
			pair.public,
			'public'
		)
		deafultTemplateForKeys.issuers.default.privateKey = formatKey(
			pair.private,
			'private'
		)
		deafultTemplateForKeys.issuers.default['$comment'] =
			'The above are auto generated keys !!'

		// Convert the new object to JSON
		const newConfigJson = JSON.stringify(deafultTemplateForKeys, null, 2)

		// Write the new JSON content to the file, replacing the old content
		filesystem.write(configFilePath, newConfigJson)
		events.emit('registry.create', {
			status: 'success',
			operation: 'Auto generating keys',
			message: 'Successfully generated keys for signing',
		})
	}

	events.emit('registry.create', {
		status: 'success',
		operation: 'copying-files',
		message: 'Successfully copied over necessary files',
	})

	if (registryVersion === Object.keys(config.versions)[1]) {
		// Start Vault Service
		// Vault Command
		let vaultcommand = config.vaultCommand
		events.emit('registry.create', {
			status: 'progress',
			operation: 'setting-up-vault-service',
			message: 'Setting up vault service',
		})
		await system.exec(vaultcommand).catch((error: Error) => {
			events.emit('registry.create', {
				status: 'error',
				operation: 'setting-up-vault-service',
				message: `An unexpected error occurred while setting up vault: ${error.message}`,
			})
		})
		events.emit('registry.create', {
			status: 'success',
			operation: 'setting-up-vault-service',
			message: 'Successfully setup vault as Keystore manager!',
		})
	}

	// Start containers
	events.emit('registry.create', {
		status: 'progress',
		operation: 'starting-containers',
		message:
			'Starting all services. Please be patient, as this operation may require some time to complete.',
	})
	//merge multiple env files
	await system.run('cat .env-cli >> .env').catch((error: Error) => {
		events.emit('registry.create', {
			status: 'error',
			operation: 'starting-containers',
			message: `An unexpected error occurred while merging multiple env files: ${error.message}`,
		})
	})
	await system.exec(conditionalEnablinOfDockerCommand).catch((error: Error) => {
		events.emit('registry.create', {
			status: 'error',
			operation: 'starting-containers',
			message: `An unexpected error occurred while starting the registry: ${error.message} ${error.stack}`,
		})
	})
	// Wait for the containers to start
	await until(allUp)
	events.emit('registry.create', {
		status: 'success',
		operation: 'starting-containers',
		message: 'Successfully started all services!',
	})

	// Configure keycloak
	// The realm-export file is automatically imported by keycloak on startup.
	// However, keycloak does not export client secret along with it. So we need to
	// regenerate it and set it in the docker-compose file before starting the registry
	events.emit('registry.create', {
		status: 'progress',
		operation: 'configuring-keycloak-admin-api',
		message: 'Configuring keycloak',
	})
	try {
		// Regenerate the client secret
		const clientSecret = await keycloak.regenerateClientSecret(
			await keycloak.getInternalClientId(setupOptions.keycloakAdminClientId)
		)
		// Replace the old client secret with the new one
		await patching.replace(
			path.resolve(process.cwd(), 'docker-compose.yml'),
			'${KEYCLOAK_SECRET}',
			clientSecret
		)

		events.emit('registry.create', {
			status: 'success',
			operation: 'configuring-keycloak-admin-api',
			message: 'Successfully configured keycloak!',
		})
	} catch (errorObject: unknown) {
		const error = errorObject as Error

		events.emit('registry.create', {
			status: 'error',
			operation: 'configuring-keycloak-admin-api',
			message: `An unexpected error occurred while configuring keycloak: ${error.message}`,
		})
	}

	// Restart Registry
	events.emit('registry.create', {
		status: 'progress',
		operation: 'restarting-containers',
		message: 'Restarting all services',
	})
	await system
		.exec('docker compose up --force-recreate --no-deps -d registry')
		.catch((error: Error) => {
			events.emit('registry.create', {
				status: 'error',
				operation: 'restarting-containers',
				message: `An unexpected error occurred while restarting the registry: ${error.message}`,
			})
		})

	// Create default user for admin and issuance portal

	events.emit('registry.create', {
		status: 'progress',
		operation: 'configuring-keycloak-portal-user',
		message: 'Setting up admin User for issuance/admin portal',
	})
	if (
		setupOptions.auxiliaryServicesToBeEnabled.includes(
			Object.keys(config.auxiliary_services)[7]
		) ||
		setupOptions.auxiliaryServicesToBeEnabled.includes(
			Object.keys(config.auxiliary_services)[6]
		)
	) {
		try {
			await registry.createAUserInRegistry(
				'portalAdmin',
				setupOptions.portalAdminUser
			)
			// Fetch the user that we created
			let user = await keycloak.fetchUserByUserName(
				setupOptions.portalAdminUser
			)
			// give admin role to the User (admin role needs to be assigned for both issuance and admin portal user)
			const clientId = await keycloak.getInternalClientId(
				setupOptions.keycloakAdminClientId
			)
			await keycloak.assignAdminRoleToUser(user[0], clientId)
			if (
				setupOptions.auxiliaryServicesToBeEnabled.includes(
					Object.keys(config.auxiliary_services)[7]
				)
			) {
				await registry.createDocumentTypeInRegistry()
			}

			events.emit('registry.create', {
				status: 'success',
				operation: 'configuring-keycloak-portal-user',
				message:
					'Successfully created an admin User for issuance/admin portal!',
			})
		} catch (errorObject: unknown) {
			console.log(errorObject)
			const error = errorObject as Error
			events.emit('registry.create', {
				status: 'error',
				operation: 'configuring-keycloak-portal-user',
				message: `An unexpected error occurred while creating portal user: ${error.message}`,
			})
		}
	}

	// Check if we need to create scopes in keycloak
	if (
		await filesystem.existsAsync(
			path.resolve(process.cwd(), 'config/consent.json')
		)
	) {
		events.emit('registry.create', {
			status: 'progress',
			operation: 'configuring-keycloak-consent',
			message: 'Setting up consent provider',
		})

		try {
			// See ../../templates/examples/student-teacher/config/consent.json for
			// a sample consent configuration file
			const consentData = JSON.parse(
				(await filesystem.readAsync(
					path.resolve(process.cwd(), 'config/consent.json')
				))!
			)

			const clientId = await keycloak.getInternalClientId(
				setupOptions.keycloakFrontendClientId
			)
			for (const scope of consentData.scopes) {
				const scopeId = await keycloak.createClientScope(scope)

				await keycloak.addOptionalClientScope(clientId, scopeId)
			}

			events.emit('registry.create', {
				status: 'success',
				operation: 'configuring-keycloak-consent',
				message: 'Successfully setup keycloak as a consent provider!',
			})
		} catch (rawError: any) {
			const error = rawError as Error

			events.emit('registry.create', {
				status: 'error',
				operation: 'configuring-keycloak-consent',
				message: `An unexpected error occurred while setting up the consent provider: ${error.message}`,
			})
		}
	}

	// Restart containers
	events.emit('registry.create', {
		status: 'progress',
		operation: 'restarting-containers',
		message: 'Restarting all services',
	})
	await system
		.exec('docker compose up --force-recreate --no-deps -d registry keycloak')
		.catch((error: Error) => {
			events.emit('registry.create', {
				status: 'error',
				operation: 'restarting-containers',
				message: `An unexpected error occurred while restarting the registry: ${error.message}`,
			})
		})
	// Wait for the containers to start
	await until(allUp)

	// All done!
	events.emit('registry.create', {
		status: 'success',
		operation: 'create-registry',
		message: 'Created new registry instance successfully!',
	})
}
