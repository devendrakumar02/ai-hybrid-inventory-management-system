# AI Hybrid Inventory - Backend

## Open in IntelliJ IDEA
1. Open this `backend` folder in IntelliJ IDEA.
2. Make sure JDK 17 is selected.
3. Let IntelliJ import the Maven project.
4. Configure MySQL and run `InventoryApplication`.

## MySQL
Create the database first:

```sql
CREATE DATABASE inventory_db;
```

The included `schema.sql` is provided as a reference/setup script.

Default Spring Boot settings:
- Server: `http://localhost:8080`
- Context path: `/api`
- Database: `jdbc:mysql://localhost:3306/inventory_db`
- Username: `root`
- Password: empty by default

If your MySQL password is different, set `DB_PASSWORD` in your run configuration or edit `application.properties`.

## Run
You can run the main class:
`com.example.inventory.InventoryApplication`

Or from the terminal:

```bash
mvn spring-boot:run
```
