import { argsSchema } from './corporation.js';
import { formatRam, scanAllServers } from './helpers.js';

const scriptName = 'corporation.js';

/**
 * Try to find a place to run our corporation script, copy it out there, and start it up.
 * @param {NS} ns
 */
export async function main(ns) {
	const scriptDependencies = ['helpers.js'];
    const scriptSize = ns.getScriptRam(scriptName, 'home');

    // Get a list of all the servers, and see if any of them can handle our script.
    let servers = scanAllServers(ns);
    servers = servers.filter((hostname) => !isFlaggedForDeletion(ns, hostname));
    servers = servers.filter((hostname) => ns.getServerMaxRam(hostname) >= scriptSize);

    if (servers.length > 0) {
        for (const hostname of servers) {
            const runningScript = checkCorporationScript(ns, hostname);
            if (runningScript) {
                ns.tail(runningScript.pid);
				ns.exit();
            }
			let freeRam = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname);
			if (freeRam > scriptSize) {
				ns.scp(scriptName, hostname);
				ns.scp(scriptDependencies, hostname);
				let pid = ns.exec(scriptName, hostname, 1, ...ns.args);
				ns.tail(pid);
				ns.exit();
			}
		}
    } else {
        ns.tprint(`No servers that can possibly run '${scriptName}' (${formatRam(scriptSize)}).`);
    }
}

function isFlaggedForDeletion(ns, hostname) {
    return hostname != 'home' && ns.fileExists('/Flags/deleting.txt', hostname);
}

/**
 * Check if the corporation.js is running on hostname
 * @param {NS} ns
 * @param {string} hostname
 * @returns {RunningScript | null}
 */
function checkCorporationScript(ns, hostname) {
    if (!ns.scriptRunning(scriptName, hostname)) {
        return null;
    }
    return ns.getRunningScript(scriptName, hostname);
}

export function autocomplete(data, _) {
    data.flags(argsSchema);
    return [];
}
