export function validateConfiguration(config: Record<string, unknown>) {
	const requiredVariables = [
		'WHATSAPP_PHONE_NUMBER_ID',
		'WHATSAPP_ACCESS_TOKEN',
		'GRAPH_API_VERSION',
		'WHATSAPP_VERIFY_TOKEN',
	];

	const missingVariables = requiredVariables.filter(
		(variableName) =>
			typeof config[variableName] !== 'string' ||
			config[variableName].trim().length === 0,
	);

	if (missingVariables.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missingVariables.join(', ')}`,
		);
	}

	return config;
}
