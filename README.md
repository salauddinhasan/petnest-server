# PetNest Server

A RESTful API server for the PetNest pet adoption platform.

## Tech Stack

- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication (Better Auth)

## API Endpoints

### Pets
- `GET /all-pets` - Get all pets (with search & filter)
- `GET /featured` - Get 4 featured pets
- `GET /pets/:id` - Get single pet
- `GET /petnest/:petnestId` - Get pet details (protected)
- `POST /pets` - Add new pet (protected)
- `PUT /pets/:id` - Update pet (protected)
- `DELETE /pets/:id` - Delete pet (protected)

### Adoption Requests
- `GET /requests` - Get requests by petId
- `POST /requests` - Submit adoption request
- `PATCH /requests/:id` - Approve/Reject request
- `DELETE /requests/:id` - Cancel request (protected)

### Dashboard
- `GET /my-listings` - Get owner's pet listings
- `GET /my-requests` - Get user's adoption requests

## Environment Variables

```env
PORT=5000
MONGODB_URL=your_mongodb_url
CLIENT_URL=http://localhost:3000
```

## Run Locally

```bash
npm install
npm start
```

## Live URL

 [https://petnest-server.vercel.app]