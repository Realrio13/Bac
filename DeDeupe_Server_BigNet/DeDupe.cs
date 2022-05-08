using System;
using System.Threading.Tasks;
using MySqlConnector;

namespace DeDeupe_Server_BigNet
{
    public class DeDupe
    {
        private MySqlConnection connection;
        private Int64 counterMax;
        private int safety;
        private int timeoutMins;
        public DeDupe(string connectionString, int nByteCounter, int safety, int timeoutMins)
        {
            // connectionString - string to connect to mysql database
            // nByteCounter - number of bytes the counter consists of
            // safety - counter + safety = maximum acceptable counter value to update table
            // timeoutMins - number of minutes after which the counter system is overwritten and IsDuplicate returns false for given address
            this.connection = new MySqlConnection(connectionString);
            this.counterMax = (Int64)(Math.Pow(2, nByteCounter * 8) - safety);
            this.safety = safety;
            this.timeoutMins = timeoutMins;
        }

        public async Task<bool> IsDuplicate(string address, int counter)
        {
            // returns true if packet is duplicate
            // address - identification of device sending recieved packet (can be any string, doesn't have to be address)
            // counter - counter value in the recieved packet
            await connection.OpenAsync();
            var command = new MySqlCommand("SELECT * FROM counter_log WHERE address = \'" + address + "\';", connection);
            var reader = await command.ExecuteReaderAsync();
            int oldCounter = 0;
            var lastUpdate = new DateTime();
            while (await reader.ReadAsync())
            {
                oldCounter = (int)reader.GetValue(1);
                lastUpdate = (DateTime)reader.GetValue(2);
            }
            await connection.CloseAsync();

            if (lastUpdate == new DateTime())
            {   // address not found in database
                await connection.OpenAsync();
                command = new MySqlCommand("INSERT INTO counter_log (address,counter,last_updated) VALUES (\'" + address + "\', " + counter.ToString() + ", CURRENT_TIMESTAMP);", connection);
                await command.ExecuteReaderAsync();
                await connection.CloseAsync();
                return false;
            }
            if ((counter < oldCounter - counterMax) | ((counter > oldCounter) & (counter < oldCounter + this.safety)))
            {   // new counter -> update field in database
                await connection.OpenAsync();
                command = new MySqlCommand("UPDATE counter_log SET counter = " + counter.ToString() + ", last_updated = CURRENT_TIMESTAMP WHERE address = \'" + address + "\';", connection);
                await command.ExecuteReaderAsync();
                await connection.CloseAsync();
                return false;
            }
            else if ((DateTime.Now - lastUpdate).Minutes >= this.timeoutMins)
            {   // timeout -> update field in database without regards to counter
                await connection.OpenAsync();
                command = new MySqlCommand("UPDATE counter_log SET counter = " + counter.ToString() + ", last_updated = CURRENT_TIMESTAMP WHERE address = \'" + address + "\';", connection);
                await command.ExecuteReaderAsync();
                return false;
            }
            else return true;   // duplicate, don't update database
        }
    }
}