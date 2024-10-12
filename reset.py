import sqlite3

def reset_database():
    # Connect to the database
    conn = sqlite3.connect('doorbell.db')
    cursor = conn.cursor()

    # Drop the users table if it exists
    cursor.execute("DROP TABLE IF EXISTS users")

    # Drop the entrances table if it exists
    cursor.execute("DROP TABLE IF EXISTS entrances")

    # Commit the changes and close the connection
    conn.commit()
    conn.close()

    print("Users and entrances tables have been dropped. Run main.py to recreate the tables.")

if __name__ == "__main__":
    reset_database()
