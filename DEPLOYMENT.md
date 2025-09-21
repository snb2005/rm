# Deployment Instructions for Render

## Quick Deploy to Render

1. Push this repository to GitHub
2. Connect your GitHub account to Render
3. Create a new Web Service on Render
4. Select this repository
5. Configure the service:

### Render Service Settings

- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Environment**: Node.js
- **Instance Type**: Choose based on expected traffic
- **Auto-Deploy**: Enable for automatic updates

### Environment Variables (Optional)

- `NODE_ENV`: `production`

### Domain Setup

After deployment, your tracking pixel will be available at:
```
https://your-app-name.onrender.com/track/:id.png
```

## Example Usage in Experiments

### HTML Email Tracking
```html
<img src="https://your-app-name.onrender.com/track/participant-123.png" width="1" height="1" style="display:none;" />
```

### JavaScript Beacon
```javascript
const trackingPixel = new Image();
trackingPixel.src = 'https://your-app-name.onrender.com/track/participant-456.png';
```

### Embedded in Web Pages
```html
<img src="https://your-app-name.onrender.com/track/participant-789.png" width="1" height="1" alt="" style="position:absolute;left:-999px;top:-999px;" />
```

## Data Collection

The server automatically creates and maintains `requests.csv` with all tracking data. You can download this file from your Render service dashboard or access it via SSH.

## Monitoring

- Check logs in Render dashboard for server status
- Monitor CSV file size for data collection
- Set up alerts for service availability

## Security Notes

- All tracking is logged with timestamps
- IP addresses are captured for geolocation analysis
- User agents help identify browser/device types
- Referer headers show traffic sources

## GDPR/Privacy Compliance

Ensure your experiment includes:
- Clear consent mechanisms
- Data retention policies
- Participant data access rights
- Secure data handling procedures
