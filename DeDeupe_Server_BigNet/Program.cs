using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace DeDeupe_Server_BigNet
{
    public class Program
    {
        public static async Task Main(string[] args)
        {
            DeDupe d = new DeDupe("server=127.0.0.1;user=Richard;password=prifni;database=counterlog", 4, 300, 5);
            var result = await d.IsDuplicate("tkest", 9);
            Console.WriteLine(result);
        }
    }
}
