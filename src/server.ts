import * as dotenv from 'dotenv';

import app from './app';

dotenv.config();

const port = process.env.PORT || 9000;

app.listen(port, () => {
	console.log(`Server is running on the port ${port}`);
});
