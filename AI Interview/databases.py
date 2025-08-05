from psycopg2 import pool

class Database:
    def __init__(self):
        try:
            self.connection_pool = pool.SimpleConnectionPool(
                1, 20,
                host="localhost",
                database="interviewDB",
                user="postgres",
                password="123456789"
            )
        except Exception as e:
            print(f"Error connecting to database: {e}")
            self.connection_pool = None

    def get_connection(self):
        if self.connection_pool:
            return self.connection_pool.getconn()
        return None

    def release_connection(self, conn):
        if self.connection_pool and conn:
            self.connection_pool.putconn(conn)

    def execute_select(self, query, values=None):
        conn = self.get_connection()
        result = []
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(query, values)
                    result = cur.fetchall()
            except Exception as e:
                print(f"[SELECT ERROR] {e}")
            finally:
                self.release_connection(conn)
        return result

    def execute_insert(self, query, values=None, return_id=False):
        conn = self.get_connection()
        inserted_id = None
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(query, values)
                    if return_id:
                        inserted_id = cur.fetchone()[0]
                    conn.commit()
            except Exception as e:
                conn.rollback()
                print(f"[INSERT ERROR] {e}")
            finally:
                self.release_connection(conn)
        return inserted_id if return_id else True

    def execute_update(self, query, values=None):
        conn = self.get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute(query, values)
                    conn.commit()
                    return True
            except Exception as e:
                conn.rollback()
                print(f"[UPDATE ERROR] {e}")
                return False
            finally:
                self.release_connection(conn)

    def init_db(self):
        conn = self.get_connection()
        if conn:
            try:
                with conn.cursor() as cur:
                    cur.execute("""CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        password VARCHAR(255) NOT NULL
                    )""")

                    cur.execute("""
                        CREATE TABLE IF NOT EXISTS interview_sessions (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER REFERENCES users(id),
                            section_type VARCHAR(50) NOT NULL,
                            selected_name VARCHAR(100),
                            creator_name VARCHAR(100),
                            company_name VARCHAR(100),
                            round_type VARCHAR(50) NOT NULL,
                            difficulty VARCHAR(50) NOT NULL,
                            duration INTEGER NOT NULL,
                            role VARCHAR(50),
                            score INTEGER,
                            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    """)


                    cur.execute("""CREATE TABLE IF NOT EXISTS interview_responses (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id),
                        interview_session_id INTEGER REFERENCES interview_sessions(id),
                        role TEXT,
                        questions TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )""")

                    conn.commit()
            except Exception as e:
                print(f"Error initializing database: {e}")
                conn.rollback()
            finally:
                self.release_connection(conn)
