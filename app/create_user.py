import hashlib
from app.database import get_connection


name = "Anushka"
email = "anushka@gmail.com"
password = "123456"


password_hash = hashlib.sha256(
    password.encode()
).hexdigest()


connection = get_connection()

cursor = connection.cursor()

cursor.execute(
    """
    INSERT INTO users (name, email, password_hash)
    VALUES (?, ?, ?)
    """,
    (name, email, password_hash)
)

connection.commit()

connection.close()

print("User created successfully!")