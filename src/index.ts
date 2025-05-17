const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const readline = require('readline');
const HttpsProxyAgent = require('https-proxy-agent');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    
    fg: {
        black: '\x1b[30m',
        red: '\x1b[31m',
        green: '\x1b[32m',
        yellow: '\x1b[33m',
        blue: '\x1b[34m',
        magenta: '\x1b[35m',
        cyan: '\x1b[36m',
        white: '\x1b[37m',
        crimson: '\x1b[38m'
    },
    bg: {
        black: '\x1b[40m',
        red: '\x1b[41m',
        green: '\x1b[42m',
        yellow: '\x1b[43m',
        blue: '\x1b[44m',
        magenta: '\x1b[45m',
        cyan: '\x1b[46m',
        white: '\x1b[47m',
        crimson: '\x1b[48m'
    }
};

// Task information with exact names from website
const tasks = [
    { id: 1, name: 'Join Telegram' },
    { id: 2, name: 'Follow Twitter' },
    { id: 3, name: 'Join Discord' },
    { id: 4, name: 'Retweet' },
    { id: 5, name: 'Follow CEO Twitter' },
    { id: 6, name: 'Retweet our pinned tweet' }
];

// Updated banner with new ASCII art
const banner = `
${colors.fg.cyan} █████╗ ██████╗ ██████╗     ███╗   ██╗ ██████╗ ██████╗ ███████╗
██╔══██╗██╔══██╗██╔══██╗    ████╗  ██║██╔═══██╗██╔══██╗██╔════╝
███████║██║  ██║██████╔╝    ██╔██╗ ██║██║   ██║██║  ██║█████╗
██╔══██║██║  ██║██╔══██╗    ██║╚██╗██║██║   ██║██║  ██║██╔══╝
██║  ██║██████╔╝██████╔╝    ██║ ╚████║╚██████╔╝██████╔╝███████╗
╚═╝  ╚═╝╚═════╝ ╚═════╝     ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚══════╝
${colors.fg.yellow}Developed by ADB NODE${colors.reset}
`;

// Function to read accounts from account.txt
function readAccounts() {
    try {
        if (!fs.existsSync('account.txt')) {
            console.log(colors.fg.red + 'account.txt file not found. Please create it with your accounts in format:' + colors.reset);
            console.log(colors.fg.yellow + 'username:password' + colors.reset);
            console.log(colors.fg.yellow + 'username2:password2' + colors.reset);
            process.exit(1);
        }

        const accounts = fs.readFileSync('account.txt', 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [username, password] = line.split(':');
                return { username, password };
            });

        if (accounts.length === 0) {
            console.log(colors.fg.red + 'No accounts found in account.txt' + colors.reset);
            process.exit(1);
        }

        return accounts;
    } catch (error) {
        console.log(colors.fg.red + 'Error reading account.txt:', error.message + colors.reset);
        process.exit(1);
    }
}

// Function to read proxies from proxies.txt
function readProxies() {
    try {
        if (!fs.existsSync('proxies.txt')) {
            console.log(colors.fg.yellow + 'proxies.txt file not found. Running without proxies.' + colors.reset);
            return [];
        }

        const proxies = fs.readFileSync('proxies.txt', 'utf8')
            .split('\n')
            .filter(line => line.trim())
            .map(line => {
                const [host, port, username, password] = line.split(':');
                return {
                    host,
                    port,
                    auth: username && password ? { username, password } : undefined
                };
            });

        return proxies;
    } catch (error) {
        console.log(colors.fg.red + 'Error reading proxies.txt:', error.message + colors.reset);
        return [];
    }
}

// Function to get a random proxy
function getRandomProxy(proxies) {
    if (!proxies || proxies.length === 0) return null;
    return proxies[Math.floor(Math.random() * proxies.length)];
}

// Function to create axios instance with proxy
function createAxiosInstance(proxy) {
    const config = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    };

    if (proxy) {
        const proxyUrl = `http://${proxy.auth ? `${proxy.auth.username}:${proxy.auth.password}@` : ''}${proxy.host}:${proxy.port}`;
        config.httpsAgent = new HttpsProxyAgent(proxyUrl);
        config.proxy = false; // Disable axios proxy to use our custom agent
    }

    return axios.create(config);
}

// Function to check if task is already completed
async function checkTaskStatus(taskId, cookies) {
    try {
        const response = await axios.get('https://defienergylabs.com/tasks', {
            headers: {
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://defienergylabs.com/tasks'
            }
        });

        // Get the HTML content
        const html = response.data;

        // Find the specific task div for this task ID
        const taskPattern = new RegExp(`<div class="task-item">[\\s\\S]*?<h4 class="task-name">[^<]*${tasks[taskId-1].name}[^<]*<\\/h4>[\\s\\S]*?<a[^>]*class="[^"]*task-btn[^"]*"[^>]*>[^<]*<\\/a>[\\s\\S]*?<\\/div>`, 'i');
        const taskMatch = html.match(taskPattern);
        
        if (!taskMatch) return false;

        // Check if task is completed by looking for specific text
        const taskDiv = taskMatch[0];
        const isCompleted = taskDiv.includes('task-btn completed') || 
                          taskDiv.includes('Task completed!') ||
                          taskDiv.includes('Completed') ||
                          taskDiv.includes('completed') ||
                          taskDiv.includes('Already Completed');

        return isCompleted;
    } catch (error) {
        return false;
    }
}

// Function to claim daily faucet
async function claimDailyFaucet(cookies) {
    try {
        const formData = new FormData();
        formData.append('claim', '');

        const response = await axios.post('https://defienergylabs.com/faucet', formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://defienergylabs.com',
                'Referer': 'https://defienergylabs.com/faucet'
            }
        });

        // Get the response HTML
        const html = response.data;

        // Check for various success and error messages in the HTML
        if (html.includes('Faucet claimed successfully') || 
            html.includes('You have claimed your daily faucet') ||
            html.includes('Successfully claimed')) {
            return {
                status: 'success',
                message: 'Faucet claimed successfully'
            };
        } else if (html.includes('You have already claimed your daily faucet') ||
                  html.includes('Already claimed') ||
                  html.includes('already claimed') ||
                  html.includes('Please wait 24 hours') ||
                  html.includes('try again tomorrow')) {
            return {
                status: 'already_claimed',
                message: 'Already claimed today'
            };
        } else {
            // If we can't determine the status, check if we're still on the faucet page
            // This means the claim was probably successful
            if (html.includes('Daily Faucet') || html.includes('Claim Faucet')) {
                return {
                    status: 'success',
                    message: 'Faucet claimed successfully'
                };
            }
            return {
                status: 'failed',
                message: 'Failed to claim faucet',
                response: html
            };
        }
    } catch (error) {
        // If there's an error, check if it's because we're already claimed
        if (error.response && error.response.data) {
            const html = error.response.data;
            if (html.includes('You have already claimed your daily faucet') ||
                html.includes('Already claimed') ||
                html.includes('already claimed') ||
                html.includes('Please wait 24 hours') ||
                html.includes('try again tomorrow')) {
                return {
                    status: 'already_claimed',
                    message: 'Already claimed today'
                };
            }
        }
        return {
            status: 'failed',
            message: error.message,
            response: error.response?.data
        };
    }
}

// Function to perform swap
async function performSwap(cookies, amount, fromToken, toToken) {
    try {
        const formData = new FormData();
        formData.append('from_token', fromToken);
        formData.append('amount', amount);
        formData.append('to_token', toToken);
        formData.append('swap', '');

        const response = await axios.post('https://defienergylabs.com/swap', formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://defienergylabs.com',
                'Referer': 'https://defienergylabs.com/swap'
            }
        });

        // Get the response HTML
        const html = response.data;

        // Check for success or error messages
        if (html.includes('Swap successful') || 
            html.includes('Successfully swapped') ||
            html.includes('Swap completed')) {
            return {
                status: 'success',
                message: 'Swap successful'
            };
        } else if (html.includes('Insufficient balance') ||
                  html.includes('Not enough tokens')) {
            return {
                status: 'failed',
                message: 'Insufficient balance'
            };
        } else if (html.includes('daily swap limit') ||
                  html.includes('already swapped today') ||
                  html.includes('swap limit reached') ||
                  html.includes('maximum swaps reached')) {
            return {
                status: 'already_swapped',
                message: 'Already Swap Today'
            };
        } else {
            return {
                status: 'failed',
                message: 'Swap failed',
                response: html
            };
        }
    } catch (error) {
        // Check error response for daily limit
        if (error.response && error.response.data) {
            const html = error.response.data;
            if (html.includes('daily swap limit') ||
                html.includes('already swapped today') ||
                html.includes('swap limit reached') ||
                html.includes('maximum swaps reached')) {
                return {
                    status: 'already_swapped',
                    message: 'Already Swap Today'
                };
            }
        }
        return {
            status: 'failed',
            message: error.message,
            response: error.response?.data
        };
    }
}

// Function to perform staking
async function performStaking(cookies, amount) {
    try {
        // First get the staking page to get any required tokens
        const getResponse = await axios.get('https://defienergylabs.com/staking', {
            headers: {
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://defienergylabs.com/dashboard'
            }
        });

        // Now perform the staking
        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('stake', '1');

        const response = await axios.post('https://defienergylabs.com/staking', formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://defienergylabs.com',
                'Referer': 'https://defienergylabs.com/staking'
            },
            maxRedirects: 5,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });

        // Get the response HTML
        const html = response.data;

        // Check for success or error messages
        if (html.includes('Staking successful') || 
            html.includes('Successfully staked') ||
            html.includes('Stake completed') ||
            html.includes('stake successful') ||
            html.includes('Successfully staked your tokens')) {
            return {
                status: 'success',
                message: `Staking successful (Amount: ${amount})`
            };
        } else if (html.includes('Insufficient balance') ||
                  html.includes('Not enough tokens') ||
                  html.includes('insufficient balance')) {
            return {
                status: 'failed',
                message: `Insufficient balance for staking (Amount: ${amount})`
            };
        } else if (html.includes('already staked') ||
                  html.includes('staking limit reached') ||
                  html.includes('already staking') ||
                  html.includes('already have an active stake')) {
            return {
                status: 'already_staked',
                message: `Already Staked Today (Amount: ${amount})`
            };
        } else if (html.includes('minimum stake') ||
                  html.includes('minimum amount')) {
            return {
                status: 'failed',
                message: `Amount below minimum stake requirement (Amount: ${amount})`
            };
        } else {
            // Try to extract error message from response
            const errorMatch = html.match(/<div class="alert alert-danger">(.*?)<\/div>/);
            const errorMessage = errorMatch ? errorMatch[1].trim() : 'Unknown error';
            
            // Check if we're still on the staking page (which might indicate success)
            if (html.includes('Staking') && html.includes('amount')) {
                return {
                    status: 'success',
                    message: `Staking successful (Amount: ${amount})`
                };
            }
            
            return {
                status: 'failed',
                message: `Staking failed: ${errorMessage} (Amount: ${amount})`,
                response: html
            };
        }
    } catch (error) {
        if (error.response && error.response.data) {
            const html = error.response.data;
            
            if (html.includes('already staked') ||
                html.includes('staking limit reached') ||
                html.includes('already have an active stake')) {
                return {
                    status: 'already_staked',
                    message: `Already Staked Today (Amount: ${amount})`
                };
            }
        }
        return {
            status: 'failed',
            message: `Staking failed: ${error.message} (Amount: ${amount})`,
            response: error.response?.data
        };
    }
}

// Function to complete a task
async function completeTask(taskId, cookies) {
    try {
        // First check if task is already completed
        const isCompleted = await checkTaskStatus(taskId, cookies);
        if (isCompleted) {
            return {
                taskId,
                status: 'already_completed'
            };
        }

        const formData = new FormData();
        formData.append('task_id', taskId);
        formData.append('complete_task', '');

        const response = await axios.post('https://defienergylabs.com/tasks', formData, {
            headers: {
                ...formData.getHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Origin': 'https://defienergylabs.com',
                'Referer': 'https://defienergylabs.com/tasks'
            }
        });

        // Check if task was actually completed
        const isNowCompleted = await checkTaskStatus(taskId, cookies);
        if (isNowCompleted) {
            return {
                taskId,
                status: 200,
                data: response.data
            };
        } else {
            // Double check if task was already completed
            const doubleCheck = await checkTaskStatus(taskId, cookies);
            if (doubleCheck) {
                return {
                    taskId,
                    status: 'already_completed'
                };
            }
            return {
                taskId,
                status: 'failed',
                error: 'Task completion failed',
                response: response.data
            };
        }
    } catch (error) {
        // If there's an error, check if task was already completed
        const isCompleted = await checkTaskStatus(taskId, cookies);
        if (isCompleted) {
            return {
                taskId,
                status: 'already_completed'
            };
        }
        return {
            taskId,
            status: 'failed',
            error: error.message,
            response: error.response?.data
        };
    }
}

// Function to handle tasks
async function handleTasks(cookieString, username) {
    console.log(`${colors.fg.cyan}[${username}] Task Status:${colors.reset}`);
    console.log(`${colors.fg.cyan}----------------${colors.reset}`);
    
    for (const task of tasks) {
        const result = await completeTask(task.id, cookieString);
        
        if (result.status === 'failed') {
            console.log(`${colors.fg.red}[${username}] ${task.name}: Failed - ${result.error}${colors.reset}`);
            if (result.response) {
                console.log(`${colors.fg.dim}Response: ${JSON.stringify(result.response).substring(0, 100)}...${colors.reset}`);
            }
        } else if (result.status === 'already_completed') {
            console.log(`${colors.fg.yellow}[${username}] ${task.name}: Already Completed${colors.reset}`);
        } else {
            console.log(`${colors.fg.green}[${username}] ${task.name}: Success${colors.reset}`);
        }
        
        // Wait for 2 seconds before next task
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Function to handle faucet and swap
async function handleFaucetAndSwap(cookieString, username, allAccounts, currentIndex) {
    // Claim faucet
    console.log(`${colors.fg.cyan}[${getCurrentTime()}] [${username}] Claiming Daily Faucet...${colors.reset}`);
    const faucetResult = await claimDailyFaucet(cookieString);
    
    if (faucetResult.status === 'success') {
        console.log(`${colors.fg.green}[${getCurrentTime()}] [${username}] Faucet: Claimed Successfully${colors.reset}`);
    } else if (faucetResult.status === 'already_claimed') {
        console.log(`${colors.fg.yellow}[${getCurrentTime()}] [${username}] Faucet: Already Claimed Today${colors.reset}`);
    } else {
        console.log(`${colors.fg.red}[${getCurrentTime()}] [${username}] Faucet: Failed - ${faucetResult.message}${colors.reset}`);
    }
    
    // Wait before starting swaps
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Perform 5 swaps
    console.log(`${colors.fg.cyan}[${getCurrentTime()}] [${username}] Performing Swaps...${colors.reset}`);
    let allSwapsFailed = true;
    let alreadySwapped = false;
    
    // Define swap patterns
    const swapPatterns = [
        { from: 'ENRG', to: 'WENRG' },
        { from: 'ENRG', to: 'WENRG' },
        { from: 'WENRG', to: 'ENRG' },
        { from: 'WENRG', to: 'ENRG' },
        { from: 'ENRG', to: 'WENRG' }
    ];
    
    for (let i = 1; i <= 5; i++) {
        // Generate random amount between 1 and 3
        const amount = (Math.random() * (3 - 1) + 1).toFixed(2);
        const { from, to } = swapPatterns[i - 1];
        
        console.log(`${colors.fg.cyan}[${getCurrentTime()}] [${username}] Swap ${i}/5 (${from} → ${to}: ${amount})${colors.reset}`);
        const swapResult = await performSwap(cookieString, amount, from, to);
        
        if (swapResult.status === 'success') {
            console.log(`${colors.fg.green}[${getCurrentTime()}] [${username}] Swap ${i}: Success (${from} → ${to}: ${amount})${colors.reset}`);
            allSwapsFailed = false;
        } else if (swapResult.status === 'already_swapped') {
            console.log(`${colors.fg.yellow}[${getCurrentTime()}] [${username}] Swap ${i}: Already Swap Today (${from} → ${to}: ${amount})${colors.reset}`);
            alreadySwapped = true;
            break;
        } else {
            console.log(`${colors.fg.red}[${getCurrentTime()}] [${username}] Swap ${i}: Failed - ${swapResult.message} (${from} → ${to}: ${amount})${colors.reset}`);
        }
        
        // Wait for 2 seconds before next swap
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Perform staking regardless of swap status
    console.log(`${colors.fg.cyan}[${getCurrentTime()}] [${username}] Performing Staking...${colors.reset}`);
    
    // Perform 3 stakes with random amounts
    for (let i = 1; i <= 3; i++) {
        const stakeAmount = (Math.random() * (2 - 0.5) + 0.5).toFixed(2);
        console.log(`${colors.fg.cyan}[${getCurrentTime()}] [${username}] Staking ${i}/3 (Amount: ${stakeAmount})...${colors.reset}`);
        const stakeResult = await performStaking(cookieString, stakeAmount);
        
        if (stakeResult.status === 'success') {
            console.log(`${colors.fg.green}[${getCurrentTime()}] [${username}] Staking ${i}: Success (Amount: ${stakeAmount})${colors.reset}`);
        } else if (stakeResult.status === 'already_staked') {
            console.log(`${colors.fg.yellow}[${getCurrentTime()}] [${username}] Staking ${i}: Already Staked Today (Amount: ${stakeAmount})${colors.reset}`);
            break;
        } else {
            console.log(`${colors.fg.red}[${getCurrentTime()}] [${username}] Staking ${i}: ${stakeResult.message} (Amount: ${stakeAmount})${colors.reset}`);
            if (stakeResult.response) {
                console.log(`${colors.fg.dim}[${getCurrentTime()}] [${username}] Error Details: ${JSON.stringify(stakeResult.response).substring(0, 200)}...${colors.reset}`);
            }
        }
        
        // Wait for 2 seconds before next stake
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // If swaps were already done, switch to next account
    if (alreadySwapped && currentIndex < allAccounts.length - 1) {
        console.log(`${colors.fg.yellow}[${getCurrentTime()}] Switching to next account...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await loginAndProcessFaucet(allAccounts[currentIndex + 1].username, allAccounts[currentIndex + 1].password, allAccounts, currentIndex + 1);
    }
    
    return allSwapsFailed ? 'swap_failed' : 'swap_success';
}

// Function to start daily route
async function startDailyRoute(accounts, proxies, rl) {
    console.log(`${colors.fg.cyan}[${getCurrentTime()}] Starting Daily Route...${colors.reset}`);
    console.log(`${colors.fg.yellow}Faucet claim and swap will run every 24 hours for all accounts. Press Ctrl+C to stop.${colors.reset}`);

    // Function to process all accounts once
    const processAllAccounts = async () => {
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            const proxy = getRandomProxy(proxies);
            console.log(`${colors.fg.cyan}[${getCurrentTime()}] Processing account ${i + 1}/${accounts.length}: ${account.username}${colors.reset}`);
            
            try {
                const cookieString = await performLogin(account.username, account.password, proxy);
                if (cookieString) {
                    await handleFaucetAndSwap(cookieString, account.username, accounts, i);
                } else {
                    console.log(`${colors.fg.red}[${getCurrentTime()}] [${account.username}] Login failed, skipping...${colors.reset}`);
                }
            } catch (error) {
                console.log(`${colors.fg.red}[${getCurrentTime()}] [${account.username}] Error in daily route: ${error.message}${colors.reset}`);
            }
            
            // Wait 2 seconds between accounts
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        console.log(`${colors.fg.green}[${getCurrentTime()}] Completed one cycle of daily route for all accounts.${colors.reset}`);
    };

    // Run immediately for the first time
    await processAllAccounts();

    // Schedule to run every 24 hours
    const interval = setInterval(async () => {
        console.log(`${colors.fg.cyan}[${getCurrentTime()}] Starting new daily route cycle...${colors.reset}`);
        await processAllAccounts();
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

    // Allow user to stop the daily route
    rl.on('SIGINT', () => {
        console.log(`${colors.fg.yellow}[${getCurrentTime()}] Stopping daily route...${colors.reset}`);
        clearInterval(interval);
        console.log(`${colors.fg.green}Returning to main menu...${colors.reset}`);
        showMenu(rl);
    });
}

// Function to process multiple accounts
async function processAccounts(accounts) {
    if (accounts.length === 0) {
        console.log(colors.fg.red + 'No accounts found in account.txt' + colors.reset);
        return;
    }

    // Read proxies
    const proxies = readProxies();
    console.log(`${colors.fg.cyan}Loaded ${proxies.length} proxies${colors.reset}`);

    // Show banner
    console.log(banner);

    // Create readline interface for menu
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Show menu and handle user choice
    const showMenu = (rl) => {
        console.log(`${colors.fg.cyan}MAIN MENU${colors.reset}`);
        console.log(`${colors.fg.cyan}----------------${colors.reset}`);
        console.log(`${colors.fg.yellow}1. Task Completed${colors.reset}`);
        console.log(`${colors.fg.yellow}2. Faucet claim and swap${colors.reset}`);
        console.log(`${colors.fg.yellow}3. Daily Route (Auto Faucet & Swap every 24 hours)${colors.reset}`);
        console.log(`${colors.fg.yellow}4. Exit${colors.reset}`);
        console.log(`${colors.fg.cyan}----------------${colors.reset}`);
        
        rl.question(`${colors.fg.green}Enter your choice (1-4): ${colors.reset}`, async (choice) => {
            const trimmedChoice = choice.trim();
            
            if (!['1', '2', '3', '4'].includes(trimmedChoice)) {
                console.log(`${colors.fg.red}Invalid choice. Please enter 1, 2, 3, or 4.${colors.reset}`);
                showMenu(rl);
                return;
            }

            const account = accounts[0];
            const proxy = getRandomProxy(proxies);
            if (proxy) {
                console.log(`${colors.fg.cyan}Using proxy: ${proxy.host}:${proxy.port}${colors.reset}`);
            }

            console.log(`\nProcessing Account: ${account.username}   {1/${accounts.length}}`);

            switch (trimmedChoice) {
                case '1':
                    await loginAndProcessTasks(account.username, account.password, accounts, 0, proxy);
                    showMenu(rl);
                    break;
                case '2':
                    await loginAndProcessFaucet(account.username, account.password, accounts, 0, proxy);
                    showMenu(rl);
                    break;
                case '3':
                    await startDailyRoute(accounts, proxies, rl);
                    break;
                case '4':
                    console.log(`${colors.fg.green}Goodbye!${colors.reset}`);
                    rl.close();
                    process.exit(0);
                    break;
            }
        });
    };

    showMenu(rl);
}

// Function to login and process tasks
async function loginAndProcessTasks(username, password, allAccounts, currentIndex, proxy) {
    try {
        const cookieString = await performLogin(username, password, proxy);
        if (cookieString) {
            await handleTasks(cookieString, username);
        }
    } catch (error) {
        console.log(`${colors.fg.red}[${username}] Error processing tasks: ${error.message}${colors.reset}`);
    }
}

// Function to login and process faucet
async function loginAndProcessFaucet(username, password, allAccounts, currentIndex, proxy) {
    try {
        const cookieString = await performLogin(username, password, proxy);
        if (cookieString) {
            await handleFaucetAndSwap(cookieString, username, allAccounts, currentIndex);
        }
    } catch (error) {
        console.log(`${colors.fg.red}[${getCurrentTime()}] [${username}] Error processing faucet: ${error.message}${colors.reset}`);
    }
}

// Function to perform login
async function performLogin(username, password, proxy) {
    try {
        const axiosInstance = createAxiosInstance(proxy);
        const loginFormData = new FormData();
        loginFormData.append('username', username);
        loginFormData.append('password', password);
        loginFormData.append('login', '');

        const loginResponse = await axiosInstance.post('https://defienergylabs.com/index', loginFormData, {
            headers: {
                ...loginFormData.getHeaders(),
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': 'https://defienergylabs.com',
                'Referer': 'https://defienergylabs.com/index'
            },
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });

        if (loginResponse.status === 302 || loginResponse.status === 301) {
            console.log(`${colors.fg.green}[${getCurrentTime()}] [${username}] Login Success!${colors.reset}`);
            
            const cookies = loginResponse.headers['set-cookie'];
            if (!cookies || cookies.length === 0) {
                console.log(`${colors.fg.red}[${getCurrentTime()}] [${username}] No cookies received from login${colors.reset}`);
                return null;
            }

            const cookieString = cookies.map(cookie => {
                const [cookiePart] = cookie.split(';');
                return cookiePart;
            }).join('; ');

            await new Promise(resolve => setTimeout(resolve, 2000));

            try {
                await axios.get('https://defienergylabs.com/dashboard', {
                    headers: {
                        'Cookie': cookieString,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://defienergylabs.com/index'
                    }
                });
                return cookieString;
            } catch (error) {
                console.log(`${colors.fg.yellow}[${getCurrentTime()}] [${username}] Warning: Could not access dashboard${colors.reset}`);
                return null;
            }
        } else {
            console.log(`${colors.fg.red}[${getCurrentTime()}] [${username}] Login Failed - Please check credentials${colors.reset}`);
            return null;
        }
    } catch (error) {
        if (error.response) {
            console.log(`${colors.fg.red}[${getCurrentTime()}] [${username}] Login Failed - Status:`, error.response.status + colors.reset);
            console.log(`${colors.fg.dim}[${getCurrentTime()}] Response: ${JSON.stringify(error.response.data).substring(0, 100)}...${colors.reset}`);
        } else {
            console.log(`${colors.fg.red}[${getCurrentTime()}] [${username}] Login Error:`, error.message + colors.reset);
        }
        return null;
    }
}

// Function to get current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
}

// Read accounts from account.txt and run the script
const accounts = readAccounts();
processAccounts(accounts);
