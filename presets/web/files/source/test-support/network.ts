import { setupServer } from 'msw/node';

// The network is a process boundary and the only double an integration test
// takes. A request nobody declared a handler for is a defect in the test.
export const server = setupServer();
