from db import get_db_session
import os

def run_migrations():
    db_session = get_db_session()
    try:
        # Read and execute the migration SQL
        migration_path = os.path.join(os.path.dirname(__file__), 'migrations', 'add_credits_column.sql')
        with open(migration_path, 'r') as f:
            sql = f.read()
            db_session.execute(sql)
            db_session.commit()
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Error running migration: {e}")
        db_session.rollback()
    finally:
        db_session.close()

if __name__ == '__main__':
    run_migrations() 