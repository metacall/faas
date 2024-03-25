export const deleteStatusMessage = (
	app: string
): {
	success: string;
	error: string;
	folderShouldntExist: string;
	appShouldntExist: string;
} => ({
	success: 'Deploy Delete Succeed',
	error: `Oops! It looks like the application (${app}) hasn't been deployed yet. Please deploy it before you delete it.`,
	folderShouldntExist: `The folder shouldnt exist after deleting it.`,
	appShouldntExist: `The application shouldnt exist after deleting it`
});
