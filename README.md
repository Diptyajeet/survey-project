# PersonaQuest Local Data Server

This project can run as a small Node website with a local JSON database.

## Start the website

```powershell
node server.js
```

Open:

- Website: `http://localhost:3000`
- Admin dashboard: `http://localhost:3000/admin.html`

## Where data is saved

User activity is saved here:

```text
data/events.json
```

Tracked events include:

- page views
- survey submissions
- reward wheel spins
- game starts
- guesses
- game wins/losses
- claim page views

## Predefined known-user database

Edit this file as admin:

```text
data/known-users.json
```

Matching rule:

- `fullName` must match
- `sex` must match
- at least one of `email`, `age`, or `photoFileName` must match

When a match is found, the survey shows Dipto's guide message, displays the known points, and prefills the fields from the `prefill` object.

Example known-user shape:

```json
{
  "id": "friend-1",
  "fullName": "Demo User",
  "email": "demo@gmail.com",
  "age": "18",
  "sex": "Female",
  "photoFileName": "demo.jpg",
  "guideMessage": "I know this person, so I filled a few answers.",
  "knownPoints": ["Point one", "Point two"],
  "prefill": {
    "favoriteHobby": "Creative design",
    "favoriteGame": "Puzzle games",
    "personalityType": "Ambivert",
    "energyType": "Night Owl"
  }
}
```

## Important hosting note

If you host this publicly and want the data to save on your computer, users must access the website through this Node server or through a public URL that forwards requests to this server. A plain static host cannot write data onto your computer by itself.
