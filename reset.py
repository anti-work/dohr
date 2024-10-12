import sqlite3

def reset_database():
    # Connect to the database
    conn = sqlite3.connect('doorbell.db')
    cursor = conn.cursor()

    # Drop the users table if it exists
    cursor.execute("DROP TABLE IF EXISTS users")

    # Commit the changes and close the connection
    conn.commit()
    conn.close()

    print("Users table has been dropped. Run main.py to recreate the table.")

if __name__ == "__main__":
    reset_database()
