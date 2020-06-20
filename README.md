# Bittrex coin tracker

Node.js application to subscribe to Bittrex market updates using SignalR client and send the updates to Telegram chat using Telegram bot.

## Demo
Example of the notification message sent to Telegram chat:

```
Market: XDN-BTC
Volume: 0.12277002
Volume change: 10%
Percent change: 20%
```

## Getting Started

1. Create Telegram bot:
    - Use botfather to create your own bot https://telegram.me/botfather
    - Save your bot's access key (don't share it)
2. How to get telegram chat id?
    - Search for your bot using global search in Telegram app.
    - Send any text message to your bot.
    - Open the following link (replace <API-access-token> with your access token): https://api.telegram.org/bot<API-access-token>/getUpdates?offset=0
    - Find `"chat: {id: '123456789'}"`
3. Set your `botKey` and `chatId` in `main.js`
4. Replace `marketToTrack` in `main.js` with the ticker you want to track
5. Run locally:
    ```
   npm install
   node main.js
   ```
6. You will be getting notifications from your bot in Telegram once every 5 minute if there was a change in the selected market.

## If you want to run it 24/7 (AWS)

1. Go to your AWS account > EC2 and Launch Instance > Amazon Linux (ami-0330ffc12d7224386)
2. Let AWS generate you a pem key to access your instance (SSH)
3. Go to your instance's security group:
    - Create inbound rule with your IP for SSH 22 port
    - Create inbound rule for HTTP 80 with IP `0.0.0.0/0`
    - Create inbound rule for HTTPS 443 with IP `0.0.0.0/0`
4. SSH into your instance:
```sudo ssh -i /<path_to_your_pem>/<your_pem_key_name>.pem ec2-user@<your_instance_public_dns>```
5. Install Node on your instance:
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
. ~/.nvm/nvm.sh
nvm install node
``` 
6. Open another terminal window and upload the app:
```
sudo scp -i /<path_to_your_pem>/<your_pem_key_name>.pem /<path_to_your_app_local>/main.js ec2-user@<your_instance_public_dns>:/home/ec2-user
sudo scp -i /<path_to_your_pem>/<your_pem_key_name>.pem /<path_to_your_app_local>/package.json ec2-user@<your_instance_public_dns>:/home/ec2-user
```
7. Once uploaded, go back to your instance and install the app:
```
npm install
```
8. Run the app in background mode:
```
nohup node main.js > /dev/null 2>&1 &
```
9. If everything is done correctly you will receive a `Starting to track the market` notification


If you need to stop the process:
- find the process id (node main.js)
```
ps -A |grep node
```
- stop it with this command:
```
kill -9 <process_id>
```

### Prerequisites

- AWS account
- Telegram account

## Authors

* **Vadim Gulkevic** - Author - [vgulkevic](https://github.com/vgulkevic)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
