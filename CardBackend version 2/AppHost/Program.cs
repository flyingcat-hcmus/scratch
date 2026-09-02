var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
                      .WithPgAdmin()
                      .WithDataVolume();

var cardDb = postgres.AddDatabase("CardDb");

builder.AddProject<Projects.API>("api")
       .WithReference(cardDb)
       .WaitFor(cardDb);

builder.Build().Run();
