export interface Config {
	DEFAULT_ES_PROVIDER_NAME: string
	DEFAULT_NS_PROVIDER_NAME: string
	DEFAULT_V1_SIGNATURE_PROVIDER_NAME : string
	DEFAULT_V2_SIGNATURE_PROVIDER_NAME : string
	DEFAULT_V2_OAUTH_RESOURCE_URI : string
	DEFAULT_V1_OAUTH_RESOURCE_URI: string
	docker_service_name: {
		ES: string
		DB: string
		REGISTRY: string
		KEYCLOAK: string
		FILE_STORAGE: string
		CLAIMS_MS: string
		CERTIFICATE_SIGHNER: string
		PUBLIC_KEY_SERVICE: string
		CERTIFICATE_API: string
		NOTIFICATION_MS: string
		ZOOKEEPER: string
		KAFKA: string
		CONTEXT_PROXY_SERVICE: string
		NGINIX: string
		METRICS: string
		CLICKHOUSE: string
		REDIS: string
		DIGI_LOCKER: string
		BULK_ISSUANCE: string
		ADMIN_PORTAL: string
		ISSUANCE_PORTAL: string
		// credentialling services
		CREDENTIAL_SERVICE : string
		CREDENTIAL_SCHEMA_SERVICE : string
		IDENTITY_SERVICE : string 
		VAULT : string
	}
	auxiliary_services: AuxiliaryServices
	definationMangerTypes: DefinationsManager
	versions: VersionManager
	maximumRetries: number
	vaultCommand: string
}

interface SignatureProvider {
	[name: string] : string
}

interface AuxiliaryServices {
	[serviceName: string]: string
}

interface VersionManager {
	[verison: string] : string
}
interface DefinationsManager {
	[name: string]: string
}

const auxiliary_services: AuxiliaryServices = {
	'Notifications Service': 'notification-ms',
	'Context Proxy Service': 'context-proxy-service',
	Nginix: 'nginx',
	'Metrics Service': 'kafka clickhouse metrics',
	'Bulk Issuance Service': 'bulk_issuance',
	'Digilocker Certificate Service': 'digilocker-certificate-api',
	'Admin Portal': 'admin-portal',
	'Issuance Portal': 'issuance-portal',
}


// change the verions of the registries based on the release 
const versionsAvailable : VersionManager  = {
	'v1.0.0' : 'v1.0.0',
	'v2.0.0' : 'v2.0.0-rc3'
}

const definationsManagers = {
	'Definitions Manager': 'DefinitionsManager',
	'Distributed Definitions Manager': 'DistributedDefinitionsManager',
}

export let config: Config = {
	DEFAULT_ES_PROVIDER_NAME:
		'dev.sunbirdrc.registry.service.ElasticSearchService',
	DEFAULT_NS_PROVIDER_NAME:
		'dev.sunbirdrc.registry.service.NativeSearchService',
	DEFAULT_V1_SIGNATURE_PROVIDER_NAME : 'dev.sunbirdrc.registry.service.impl.SignatureV1ServiceImpl' ,
	DEFAULT_V2_SIGNATURE_PROVIDER_NAME : 'dev.sunbirdrc.registry.service.impl.SignatureV2ServiceImpl',
	DEFAULT_V2_OAUTH_RESOURCE_URI : 'http://keycloak:8080/auth/realms/sunbird-rc',
	DEFAULT_V1_OAUTH_RESOURCE_URI : 'http://localhost:8080/auth/realms/sunbird-rc',
	docker_service_name: {
		ES: 'es',
		DB: 'db',
		REGISTRY: 'registry',
		KEYCLOAK: 'keycloak',
		FILE_STORAGE: 'file-storage',
		CLAIMS_MS: 'claim-ms',
		CERTIFICATE_SIGHNER: 'certificate-signer',
		PUBLIC_KEY_SERVICE: 'public-key-service',
		CERTIFICATE_API: 'certificate-api',
		NOTIFICATION_MS: 'notification-ms',
		ZOOKEEPER: 'zookeeper',
		KAFKA: 'kafka',
		CONTEXT_PROXY_SERVICE: 'context-proxy-service',
		NGINIX: 'nginx',
		METRICS: 'metrics',
		CLICKHOUSE: 'clickhouse',
		REDIS: 'redis',
		DIGI_LOCKER: 'digilocker-certificate-api',
		BULK_ISSUANCE: 'bulk_issuance',
		ADMIN_PORTAL: 'admin-portal',
		ISSUANCE_PORTAL: 'issuance-portal',
		CREDENTIAL_SERVICE : 'credential',
		CREDENTIAL_SCHEMA_SERVICE : 'credential-schema',
		IDENTITY_SERVICE : 'identity' ,
		VAULT: 'vault'
	},
	auxiliary_services: auxiliary_services,
	definationMangerTypes: definationsManagers,
	versions : versionsAvailable,
	maximumRetries: 100,
	vaultCommand : 'bash setup_vault.sh docker-compose.yml vault'
}
