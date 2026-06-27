/**
 * The AssessMate.API solution exposes two launch profiles
 * (AIAssessment.API/Properties/launchSettings.json):
 *   http:  http://localhost:5274
 *   https: https://localhost:7171
 *
 * `dotnet run` without a profile flag uses the "http" profile, so that's
 * the default here. Switch to the https URL if you run the https
 * profile instead (you'll need to trust the ASP.NET Core dev cert once:
 * `dotnet dev-certs https --trust`).
 */
export const API_BASE_URL = 'https://localhost:7171/api';

/** Same origin as API_BASE_URL, without the /api suffix — used for the
 *  SignalR hub, which Program.cs maps at the root (/hubs/...), not
 *  under /api like every REST endpoint. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api$/, '');