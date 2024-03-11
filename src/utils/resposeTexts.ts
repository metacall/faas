export const deleteStatusMessage = (
	app: string
): {
	success: string;
	error: string;
} => ({
	success: 'Deploy Delete Succeed',
	error: `Oops! It looks like the application (${app}) hasn't been deployed yet. Please deploy it before you delete it.`
});
